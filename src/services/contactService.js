/**
 * Knight Contact Management Service
 * Comprehensive contact storage and organization system
 */

const Logger = require('../utils/logger');
const database = require('../database');
const fs = require('fs');
const path = require('path');

class ContactService {
  constructor() {
    this.cache = new Map(); // Cache for contact data
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes cache
  }

  async initialize() {
    try {
      Logger.success('Contact service initialized');
      
      // Start periodic contact reminder checking
      setInterval(() => {
        this.checkContactReminders();
      }, 60 * 60 * 1000); // Check every hour
    } catch (error) {
      Logger.error(`Contact service initialization failed: ${error.message}`);
    }
  }

  async addContact(userId, contactData) {
    try {
      const {
        name,
        phoneNumber,
        email = null,
        address = null,
        company = null,
        position = null,
        birthday = null,
        notes = null,
        tags = []
      } = contactData;

      // Validate required fields
      if (!name || !phoneNumber) {
        throw new Error('Name and phone number are required');
      }

      // Insert into database
      const result = await database.db.run(`
        INSERT INTO contacts 
        (user_jid, name, phone_number, email, address, company, position, birthday, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        userId,
        name.trim(),
        phoneNumber.trim(),
        email,
        address,
        company,
        position,
        birthday,
        notes
      ]);

      const contactId = result.lastID;
      
      Logger.info(`Added contact ${contactId}: ${name}`);
      
      // Add tags if provided
      if (tags && Array.isArray(tags) && tags.length > 0) {
        await this.addContactTags(contactId, tags);
      }
      
      return contactId;
    } catch (error) {
      Logger.error(`Failed to add contact: ${error.message}`);
      throw new Error(`Failed to add contact: ${error.message}`);
    }
  }

  async updateContact(contactId, userId, updates) {
    try {
      // Verify contact belongs to user
      const contact = await this.getContact(contactId, userId);
      if (!contact) {
        throw new Error('Contact not found or access denied');
      }

      // Build update query dynamically
      const fields = [];
      const values = [];
      
      Object.keys(updates).forEach(key => {
        if (key !== 'id' && key !== 'user_jid') { // Don't allow updating these
          fields.push(`${key} = ?`);
          values.push(updates[key]);
        }
      });
      
      if (fields.length === 0) {
        return contact; // No updates needed
      }
      
      values.push(contactId, userId);
      
      // Update in database
      await database.db.run(`
        UPDATE contacts 
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND user_jid = ?
      `, values);
      
      // Reload contact
      const updatedContact = await this.getContact(contactId, userId);
      
      Logger.info(`Updated contact ${contactId}: ${updatedContact.name}`);
      return updatedContact;
    } catch (error) {
      Logger.error(`Failed to update contact ${contactId}: ${error.message}`);
      throw new Error(`Failed to update contact: ${error.message}`);
    }
  }

  async deleteContact(contactId, userId) {
    try {
      // Verify contact belongs to user
      const contact = await this.getContact(contactId, userId);
      if (!contact) {
        throw new Error('Contact not found or access denied');
      }
      
      // Delete from database
      await database.db.run(`
        DELETE FROM contacts 
        WHERE id = ? AND user_jid = ?
      `, [contactId, userId]);
      
      // Delete associated tags
      await database.db.run(`
        DELETE FROM contact_tags 
        WHERE contact_id = ?
      `, [contactId]);
      
      // Delete associated reminders
      await database.db.run(`
        DELETE FROM contact_reminders 
        WHERE contact_id = ?
      `, [contactId]);
      
      Logger.info(`Deleted contact ${contactId}: ${contact.name}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to delete contact ${contactId}: ${error.message}`);
      return false;
    }
  }

  async getContact(contactId, userId) {
    try {
      const contact = await database.db.get(`
        SELECT * FROM contacts 
        WHERE id = ? AND user_jid = ?
      `, [contactId, userId]);
      
      if (contact) {
        // Get tags
        const tags = await this.getContactTags(contactId);
        contact.tags = tags;
        
        // Get reminders
        const reminders = await this.getContactReminders(contactId);
        contact.reminders = reminders;
      }
      
      return contact;
    } catch (error) {
      Logger.error(`Failed to get contact ${contactId}: ${error.message}`);
      return null;
    }
  }

  async getUserContacts(userId, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        sortBy = 'name',
        sortOrder = 'ASC',
        search = null,
        tags = null,
        company = null,
        group = null
      } = options;

      let query = `
        SELECT c.*, COUNT(ct.tag) as tag_count, COUNT(cr.id) as reminder_count
        FROM contacts c
        LEFT JOIN contact_tags ct ON c.id = ct.contact_id
        LEFT JOIN contact_reminders cr ON c.id = cr.contact_id AND cr.active = 1
        WHERE c.user_jid = ?
      `;
      let params = [userId];
      
      if (search) {
        query += ' AND (c.name LIKE ? OR c.phone_number LIKE ? OR c.email LIKE ? OR c.company LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }
      
      if (tags && Array.isArray(tags) && tags.length > 0) {
        query += ' AND ct.tag IN (' + tags.map(() => '?').join(',') + ')';
        params.push(...tags);
      }
      
      if (company) {
        query += ' AND c.company = ?';
        params.push(company);
      }
      
      if (group) {
        query += ' AND c.group_id = ?';
        params.push(group);
      }
      
      query += ` GROUP BY c.id ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      
      const contacts = await database.db.all(query, params);
      
      // Get tags for each contact
      for (const contact of contacts) {
        contact.tags = await this.getContactTags(contact.id);
        contact.reminders = await this.getContactReminders(contact.id);
      }
      
      return contacts;
    } catch (error) {
      Logger.error(`Failed to get user contacts: ${error.message}`);
      return [];
    }
  }

  async searchContacts(userId, query, options = {}) {
    try {
      const {
        limit = 20,
        offset = 0
      } = options;

      const contacts = await database.db.all(`
        SELECT * FROM contacts 
        WHERE user_jid = ? 
        AND (name LIKE ? OR phone_number LIKE ? OR email LIKE ? OR company LIKE ?)
        ORDER BY name ASC 
        LIMIT ? OFFSET ?
      `, [
        userId, 
        `%${query}%`, 
        `%${query}%`, 
        `%${query}%`, 
        `%${query}%`,
        limit,
        offset
      ]);
      
      // Get tags for each contact
      for (const contact of contacts) {
        contact.tags = await this.getContactTags(contact.id);
      }
      
      return contacts;
    } catch (error) {
      Logger.error(`Failed to search contacts: ${error.message}`);
      return [];
    }
  }

  async addContactTags(contactId, tags) {
    try {
      if (!Array.isArray(tags) || tags.length === 0) {
        return;
      }
      
      // Insert tags
      for (const tag of tags) {
        await database.db.run(`
          INSERT OR IGNORE INTO contact_tags 
          (contact_id, tag, added_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
        `, [contactId, tag.toLowerCase()]);
      }
      
      Logger.info(`Added ${tags.length} tags to contact ${contactId}`);
    } catch (error) {
      Logger.error(`Failed to add contact tags: ${error.message}`);
    }
  }

  async removeContactTag(contactId, tag) {
    try {
      await database.db.run(`
        DELETE FROM contact_tags 
        WHERE contact_id = ? AND tag = ?
      `, [contactId, tag.toLowerCase()]);
      
      Logger.info(`Removed tag ${tag} from contact ${contactId}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to remove contact tag: ${error.message}`);
      return false;
    }
  }

  async getContactTags(contactId) {
    try {
      const tags = await database.db.all(`
        SELECT tag FROM contact_tags 
        WHERE contact_id = ?
        ORDER BY added_at DESC
      `, [contactId]);
      
      return tags.map(tag => tag.tag);
    } catch (error) {
      Logger.error(`Failed to get contact tags: ${error.message}`);
      return [];
    }
  }

  async getUserTags(userId) {
    try {
      const tags = await database.db.all(`
        SELECT DISTINCT ct.tag, COUNT(*) as count
        FROM contact_tags ct
        JOIN contacts c ON ct.contact_id = c.id
        WHERE c.user_jid = ?
        GROUP BY ct.tag
        ORDER BY count DESC
      `, [userId]);
      
      return tags;
    } catch (error) {
      Logger.error(`Failed to get user tags: ${error.message}`);
      return [];
    }
  }

  async setContactReminder(userId, contactId, reminderData) {
    try {
      const {
        reminderType,
        message,
        dueDate,
        recurring = false,
        interval = null
      } = reminderData;

      // Verify contact belongs to user
      const contact = await this.getContact(contactId, userId);
      if (!contact) {
        throw new Error('Contact not found or access denied');
      }

      // Insert into database
      const result = await database.db.run(`
        INSERT INTO contact_reminders 
        (user_jid, contact_id, reminder_type, message, due_date, recurring, interval, active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      `, [
        userId,
        contactId,
        reminderType,
        message,
        dueDate,
        recurring ? 1 : 0,
        interval
      ]);

      const reminderId = result.lastID;
      
      Logger.info(`Set contact reminder ${reminderId} for contact ${contactId}`);
      return reminderId;
    } catch (error) {
      Logger.error(`Failed to set contact reminder: ${error.message}`);
      throw new Error(`Failed to set contact reminder: ${error.message}`);
    }
  }

  async getContactReminders(contactId) {
    try {
      const reminders = await database.db.all(`
        SELECT * FROM contact_reminders 
        WHERE contact_id = ? AND active = 1
        ORDER BY due_date ASC
      `, [contactId]);
      
      return reminders;
    } catch (error) {
      Logger.error(`Failed to get contact reminders: ${error.message}`);
      return [];
    }
  }

  async getUserReminders(userId, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        upcomingOnly = true
      } = options;

      let query = `
        SELECT cr.*, c.name as contact_name, c.phone_number
        FROM contact_reminders cr
        JOIN contacts c ON cr.contact_id = c.id
        WHERE cr.user_jid = ? AND cr.active = 1
      `;
      let params = [userId];
      
      if (upcomingOnly) {
        query += ' AND cr.due_date >= CURRENT_TIMESTAMP';
      }
      
      query += ' ORDER BY cr.due_date ASC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      const reminders = await database.db.all(query, params);
      
      return reminders;
    } catch (error) {
      Logger.error(`Failed to get user reminders: ${error.message}`);
      return [];
    }
  }

  async removeContactReminder(reminderId, userId) {
    try {
      await database.db.run(`
        UPDATE contact_reminders 
        SET active = 0 
        WHERE id = ? AND user_jid = ?
      `, [reminderId, userId]);
      
      Logger.info(`Removed contact reminder ${reminderId}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to remove contact reminder ${reminderId}: ${error.message}`);
      return false;
    }
  }

  async checkContactReminders() {
    try {
      // Get all active reminders that are due
      const reminders = await database.db.all(`
        SELECT cr.*, c.name as contact_name, u.jid as user_jid
        FROM contact_reminders cr
        JOIN contacts c ON cr.contact_id = c.id
        JOIN users u ON cr.user_jid = u.jid
        WHERE cr.active = 1 AND cr.due_date <= CURRENT_TIMESTAMP
      `);
      
      // Check each reminder
      for (const reminder of reminders) {
        try {
          // Trigger reminder
          await this.sendContactReminder(reminder);
          
          // Handle recurring reminders
          if (reminder.recurring && reminder.interval) {
            await this.rescheduleRecurringReminder(reminder);
          } else {
            // Deactivate one-time reminder
            await database.db.run(`
              UPDATE contact_reminders 
              SET active = 0 
              WHERE id = ?
            `, [reminder.id]);
          }
        } catch (error) {
          Logger.error(`Failed to check contact reminder ${reminder.id}: ${error.message}`);
        }
      }
    } catch (error) {
      Logger.error(`Failed to check contact reminders: ${error.message}`);
    }
  }

  async rescheduleRecurringReminder(reminder) {
    try {
      // Calculate next occurrence
      const nextDueDate = this.calculateNextOccurrence(reminder.due_date, reminder.interval);
      
      if (nextDueDate) {
        // Update reminder with new due date
        await database.db.run(`
          UPDATE contact_reminders 
          SET due_date = ? 
          WHERE id = ?
        `, [nextDueDate.toISOString(), reminder.id]);
        
        Logger.info(`Rescheduled recurring reminder ${reminder.id} to ${nextDueDate.toLocaleString()}`);
      }
    } catch (error) {
      Logger.error(`Failed to reschedule recurring reminder ${reminder.id}: ${error.message}`);
    }
  }

  calculateNextOccurrence(currentDate, interval) {
    try {
      const date = new Date(currentDate);
      const intervalMatch = interval.match(/^(\d+)([dwm])$/);
      
      if (!intervalMatch) {
        return null;
      }
      
      const amount = parseInt(intervalMatch[1]);
      const unit = intervalMatch[2];
      
      switch (unit) {
        case 'd': // days
          date.setDate(date.getDate() + amount);
          break;
        case 'w': // weeks
          date.setDate(date.getDate() + (amount * 7));
          break;
        case 'm': // months
          date.setMonth(date.getMonth() + amount);
          break;
        default:
          return null;
      }
      
      return date;
    } catch (error) {
      Logger.error(`Failed to calculate next occurrence: ${error.message}`);
      return null;
    }
  }

  async sendContactReminder(reminder) {
    try {
      Logger.info(`Sending contact reminder to ${reminder.user_jid} for ${reminder.contact_name}`);
      
      // This would use the WhatsApp client to send the reminder
      // For now, we'll log it
      Logger.info(`CONTACT REMINDER: ${reminder.reminder_type} for ${reminder.contact_name} - ${reminder.message}`);
      
      // In a real implementation, you'd send the actual message:
      // await whatsappClient.sendMessage(reminder.user_jid, {
      //   text: `📞 *Contact Reminder*
      //   
      //   ${reminder.reminder_type}: ${reminder.contact_name}
      //   Message: ${reminder.message}
      //   Due: ${new Date(reminder.due_date).toLocaleString()}
      //   
      //   Set at: ${new Date(reminder.created_at).toLocaleString()}`
      // });
      
    } catch (error) {
      Logger.error(`Failed to send contact reminder to ${reminder.user_jid}: ${error.message}`);
    }
  }

  async getUpcomingBirthdays(userId, days = 30) {
    try {
      const upcomingBirthdays = await database.db.all(`
        SELECT * FROM contacts 
        WHERE user_jid = ? 
        AND birthday IS NOT NULL 
        AND birthday >= CURRENT_DATE 
        AND birthday <= date('now', '+${days} days')
        ORDER BY birthday ASC
      `, [userId]);
      
      return upcomingBirthdays;
    } catch (error) {
      Logger.error(`Failed to get upcoming birthdays: ${error.message}`);
      return [];
    }
  }

  async getContactInteractions(contactId) {
    try {
      const interactions = await database.db.all(`
        SELECT * FROM contact_interactions 
        WHERE contact_id = ?
        ORDER BY interaction_date DESC
        LIMIT 50
      `, [contactId]);
      
      return interactions;
    } catch (error) {
      Logger.error(`Failed to get contact interactions: ${error.message}`);
      return [];
    }
  }

  async logContactInteraction(contactId, interactionType, notes = null) {
    try {
      await database.db.run(`
        INSERT INTO contact_interactions 
        (contact_id, interaction_type, notes, interaction_date)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [contactId, interactionType, notes]);
      
      Logger.info(`Logged interaction for contact ${contactId}: ${interactionType}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to log contact interaction: ${error.message}`);
      return false;
    }
  }

  async exportContacts(userId, format = 'json') {
    try {
      const contacts = await this.getUserContacts(userId, { limit: 1000 });
      
      let exportedData;
      let filename;
      
      switch (format.toLowerCase()) {
        case 'csv':
          exportedData = this.formatContactsCSV(contacts);
          filename = `contacts_${userId}_${Date.now()}.csv`;
          break;
        case 'json':
        default:
          exportedData = JSON.stringify(contacts, null, 2);
          filename = `contacts_${userId}_${Date.now()}.json`;
          break;
      }
      
      // Save to file
      const exportDir = path.join(__dirname, '..', '..', 'exports');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }
      
      const filepath = path.join(exportDir, filename);
      fs.writeFileSync(filepath, exportedData);
      
      Logger.info(`Exported ${contacts.length} contacts to ${filename}`);
      return {
        filepath: filepath,
        filename: filename,
        format: format,
        count: contacts.length
      };
    } catch (error) {
      Logger.error(`Failed to export contacts: ${error.message}`);
      throw new Error(`Failed to export contacts: ${error.message}`);
    }
  }

  formatContactsCSV(contacts) {
    if (contacts.length === 0) {
      return 'Name,Phone Number,Email,Address,Company,Position,Birthday,Notes\n';
    }
    
    let csv = 'Name,Phone Number,Email,Address,Company,Position,Birthday,Notes\n';
    
    contacts.forEach(contact => {
      const row = [
        `"${contact.name || ''}"`,
        `"${contact.phone_number || ''}"`,
        `"${contact.email || ''}"`,
        `"${contact.address || ''}"`,
        `"${contact.company || ''}"`,
        `"${contact.position || ''}"`,
        `"${contact.birthday || ''}"`,
        `"${contact.notes || ''}"`
      ].join(',');
      
      csv += row + '\n';
    });
    
    return csv;
  }

  async importContacts(userId, filepath, format = 'json') {
    try {
      const fileData = fs.readFileSync(filepath, 'utf8');
      let contacts;
      
      switch (format.toLowerCase()) {
        case 'csv':
          contacts = this.parseContactsCSV(fileData);
          break;
        case 'json':
        default:
          contacts = JSON.parse(fileData);
          break;
      }
      
      let importedCount = 0;
      let failedCount = 0;
      
      for (const contact of contacts) {
        try {
          await this.addContact(userId, contact);
          importedCount++;
        } catch (error) {
          Logger.error(`Failed to import contact ${contact.name}: ${error.message}`);
          failedCount++;
        }
      }
      
      Logger.info(`Imported ${importedCount} contacts, ${failedCount} failed`);
      return {
        imported: importedCount,
        failed: failedCount,
        total: contacts.length
      };
    } catch (error) {
      Logger.error(`Failed to import contacts: ${error.message}`);
      throw new Error(`Failed to import contacts: ${error.message}`);
    }
  }

  parseContactsCSV(csvData) {
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(header => header.replace(/"/g, '').trim());
    const contacts = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '') continue;
      
      const values = lines[i].split(',').map(value => value.replace(/"/g, '').trim());
      const contact = {};
      
      headers.forEach((header, index) => {
        if (index < values.length) {
          contact[header.toLowerCase().replace(' ', '_')] = values[index];
        }
      });
      
      contacts.push(contact);
    }
    
    return contacts;
  }

  async getContactGroups(userId) {
    try {
      const groups = await database.db.all(`
        SELECT * FROM contact_groups 
        WHERE user_jid = ?
        ORDER BY name ASC
      `, [userId]);
      
      return groups;
    } catch (error) {
      Logger.error(`Failed to get contact groups: ${error.message}`);
      return [];
    }
  }

  async createContactGroup(userId, name, description = null) {
    try {
      const result = await database.db.run(`
        INSERT INTO contact_groups 
        (user_jid, name, description, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [userId, name, description]);
      
      const groupId = result.lastID;
      
      Logger.info(`Created contact group ${groupId}: ${name}`);
      return groupId;
    } catch (error) {
      Logger.error(`Failed to create contact group: ${error.message}`);
      throw new Error(`Failed to create contact group: ${error.message}`);
    }
  }

  async addContactToGroup(contactId, groupId, userId) {
    try {
      // Verify contact and group belong to user
      const contact = await this.getContact(contactId, userId);
      const group = await database.db.get(`
        SELECT * FROM contact_groups 
        WHERE id = ? AND user_jid = ?
      `, [groupId, userId]);
      
      if (!contact || !group) {
        throw new Error('Contact or group not found or access denied');
      }
      
      await database.db.run(`
        INSERT OR IGNORE INTO contact_group_members 
        (contact_id, group_id, added_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `, [contactId, groupId]);
      
      Logger.info(`Added contact ${contactId} to group ${groupId}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to add contact to group: ${error.message}`);
      return false;
    }
  }

  async removeContactFromGroup(contactId, groupId, userId) {
    try {
      await database.db.run(`
        DELETE FROM contact_group_members 
        WHERE contact_id = ? AND group_id = ? AND EXISTS (
          SELECT 1 FROM contacts c WHERE c.id = ? AND c.user_jid = ?
        ) AND EXISTS (
          SELECT 1 FROM contact_groups cg WHERE cg.id = ? AND cg.user_jid = ?
        )
      `, [contactId, groupId, contactId, userId, groupId, userId]);
      
      Logger.info(`Removed contact ${contactId} from group ${groupId}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to remove contact from group: ${error.message}`);
      return false;
    }
  }

  async getGroupContacts(groupId, userId) {
    try {
      const contacts = await database.db.all(`
        SELECT c.* 
        FROM contacts c
        JOIN contact_group_members cgm ON c.id = cgm.contact_id
        WHERE cgm.group_id = ? AND c.user_jid = ?
        ORDER BY c.name ASC
      `, [groupId, userId]);
      
      return contacts;
    } catch (error) {
      Logger.error(`Failed to get group contacts: ${error.message}`);
      return [];
    }
  }

  async syncWhatsAppContacts(userId, whatsappContacts) {
    try {
      let syncedCount = 0;
      let updatedCount = 0;
      
      for (const contact of whatsappContacts) {
        try {
          // Check if contact already exists
          const existingContact = await database.db.get(`
            SELECT * FROM contacts 
            WHERE user_jid = ? AND phone_number = ?
          `, [userId, contact.phoneNumber]);
          
          if (existingContact) {
            // Update existing contact
            await database.db.run(`
              UPDATE contacts 
              SET name = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `, [contact.name, existingContact.id]);
            updatedCount++;
          } else {
            // Add new contact
            await database.db.run(`
              INSERT INTO contacts 
              (user_jid, name, phone_number, created_at)
              VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `, [userId, contact.name, contact.phoneNumber]);
            syncedCount++;
          }
        } catch (error) {
          Logger.error(`Failed to sync contact ${contact.name}: ${error.message}`);
        }
      }
      
      Logger.info(`Synced ${syncedCount} new contacts, updated ${updatedCount} existing contacts`);
      return {
        synced: syncedCount,
        updated: updatedCount,
        total: whatsappContacts.length
      };
    } catch (error) {
      Logger.error(`Failed to sync WhatsApp contacts: ${error.message}`);
      throw new Error(`Failed to sync WhatsApp contacts: ${error.message}`);
    }
  }

  formatContact(contact) {
    let response = `👤 *${contact.name}*
🆔 ${contact.id}
📞 ${contact.phone_number}
📧 ${contact.email || 'N/A'}
🏢 ${contact.company || 'N/A'}${contact.position ? ` - ${contact.position}` : ''}
📍 ${contact.address || 'N/A'}
🎂 ${contact.birthday ? new Date(contact.birthday).toLocaleDateString() : 'N/A'}
📅 Added: ${new Date(contact.created_at).toLocaleDateString()}
🔄 Updated: ${contact.updated_at ? new Date(contact.updated_at).toLocaleDateString() : 'Never'}`;

    if (contact.notes) {
      response += `\n\n📝 Notes: ${contact.notes.substring(0, 100)}${contact.notes.length > 100 ? '...' : ''}`;
    }
    
    if (contact.tags && contact.tags.length > 0) {
      response += `\n\n🏷️ Tags: ${contact.tags.join(', ')}`;
    }
    
    if (contact.reminders && contact.reminders.length > 0) {
      response += `\n\n🔔 Active Reminders: ${contact.reminders.length}`;
    }
    
    return response;
  }

  formatContactList(contacts) {
    if (contacts.length === 0) {
      return '📇 Your contact list is empty.';
    }
    
    let response = `📇 *Your Contacts* (${contacts.length})\n\n`;
    
    contacts.slice(0, 20).forEach((contact, index) => {
      response += `${index + 1}. 👤 ${contact.name}
📞 ${contact.phone_number}
📧 ${contact.email || 'N/A'}
🏢 ${contact.company || 'N/A'}${contact.position ? ` - ${contact.position}` : ''}
📍 ${contact.address || 'N/A'}
🎂 ${contact.birthday ? new Date(contact.birthday).toLocaleDateString() : 'N/A'}
🏷️ Tags: ${contact.tags && contact.tags.length > 0 ? contact.tags.slice(0, 3).join(', ') : 'None'}
🔔 Reminders: ${contact.reminder_count || 0}\n\n`;
    });
    
    if (contacts.length > 20) {
      response += `... and ${contacts.length - 20} more contacts`;
    }
    
    return response;
  }

  formatReminder(reminder) {
    const recurringEmoji = reminder.recurring ? '🔁' : '⏰';
    
    return `${recurringEmoji} *${reminder.reminder_type}*
👤 ${reminder.contact_name} (${reminder.phone_number})
📝 ${reminder.message}
📅 Due: ${new Date(reminder.due_date).toLocaleString()}
🆔 ${reminder.id}
📅 Set: ${new Date(reminder.created_at).toLocaleString()}`;
  }

  formatReminderList(reminders) {
    if (reminders.length === 0) {
      return '🔔 You have no active contact reminders.';
    }
    
    let response = `🔔 *Your Contact Reminders* (${reminders.length})\n\n`;
    
    reminders.slice(0, 15).forEach((reminder, index) => {
      const recurringEmoji = reminder.recurring ? '🔁' : '⏰';
      
      response += `${index + 1}. ${recurringEmoji} ${reminder.reminder_type}
👤 ${reminder.contact_name} (${reminder.phone_number})
📝 ${reminder.message.substring(0, 50)}${reminder.message.length > 50 ? '...' : ''}
📅 Due: ${new Date(reminder.due_date).toLocaleString()}
🆔 ${reminder.id}\n\n`;
    });
    
    if (reminders.length > 15) {
      response += `... and ${reminders.length - 15} more reminders`;
    }
    
    return response;
  }

  cleanupCache() {
    try {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if ((now - value.timestamp) > this.cacheTimeout) {
          this.cache.delete(key);
        }
      }
      Logger.info(`Cleaned up contact cache, ${this.cache.size} items remaining`);
    } catch (error) {
      Logger.error(`Failed to cleanup contact cache: ${error.message}`);
    }
  }
}

module.exports = new ContactService();