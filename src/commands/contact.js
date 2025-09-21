/**
 * Contact Command
 * Comprehensive contact management and organization system
 */

const contactService = require('../services/contactService');
const Logger = require('../utils/logger');

module.exports = {
  name: 'contact',
  aliases: ['contacts', 'phonebook', 'addressbook'],
  category: 'utility',
  description: 'Comprehensive contact management and organization system',
  usage: '!contact <subcommand> [options]',
  
  async execute(client, message, args) {
    const subcommand = args[0]?.toLowerCase() || 'help';
    const userId = message.key.remoteJid;
    
    switch (subcommand) {
      case 'help':
        return `📇 *Knight Contact Manager*
        
Available subcommands:
▫️ help - Show this help
▫️ add <name> <phone> [--email <email>] [--company <company>] [--position <position>] [--birthday <YYYY-MM-DD>] [--notes <notes>] [--tags <tag1,tag2>] - Add new contact
▫️ list [--search <query>] [--tags <tag1,tag2>] [--company <company>] [--group <group_id>] - List contacts
▫️ view <contact_id> - View contact details
▫️ update <contact_id> <field> <value> - Update contact field
▫️ delete <contact_id> - Delete a contact
▫️ search <query> - Search contacts
▫️ tags - Show your contact tags
▫️ add-tag <contact_id> <tag> - Add tag to contact
▫️ remove-tag <contact_id> <tag> - Remove tag from contact
▫️ reminder <contact_id> <type> <message> <due_date> [--recurring <interval>] - Set contact reminder
▫️ reminders [--upcoming] - List your contact reminders
▫️ remove-reminder <reminder_id> - Remove a contact reminder
▫️ birthdays [--days <number>] - Show upcoming birthdays
▫️ groups - List your contact groups
▫️ create-group <name> [description] - Create new contact group
▫️ add-to-group <contact_id> <group_id> - Add contact to group
▫️ remove-from-group <contact_id> <group_id> - Remove contact from group
▫️ group <group_id> - View group details
▫️ portfolio - Show your contact portfolio
▫️ add-to-portfolio <contact_id> - Add contact to portfolio
▫️ remove-from-portfolio <portfolio_id> - Remove contact from portfolio
▫️ export [--format json|csv] - Export contacts
▫️ import <filepath> [--format json|csv] - Import contacts
▫️ sync - Sync with WhatsApp contacts
▫️ stats - Show contact statistics

Examples:
!contact add "John Doe" +1234567890 --email john@example.com --company "ABC Corp" --position "Manager" --birthday 1990-01-01 --notes "Important client" --tags client,important
!contact list
!contact list --search john --tags client
!contact view 123
!contact update 123 email john.doe@newcompany.com
!contact delete 123
!contact search "john doe"
!contact tags
!contact add-tag 123 important
!contact remove-tag 123 important
!contact reminder 123 call "Follow up on project" "2025-12-25 14:30" --recurring 1w
!contact reminders
!contact remove-reminder 456
!contact birthdays --days 30
!contact groups
!contact create-group "Clients" "Important business contacts"
!contact add-to-group 123 789
!contact remove-from-group 123 789
!contact group 789
!contact portfolio
!contact add-to-portfolio 123
!contact remove-from-portfolio 456
!contact export --format csv
!contact import /path/to/contacts.json --format json
!contact sync
!contact stats`;

      case 'add':
        if (args.length < 3) {
          return `❌ Usage: !contact add <name> <phone> [--email <email>] [--company <company>] [--position <position>] [--birthday <YYYY-MM-DD>] [--notes <notes>] [--tags <tag1,tag2>]
          
Examples:
!contact add "John Doe" +1234567890 --email john@example.com --company "ABC Corp" --position "Manager" --birthday 1990-01-01 --notes "Important client" --tags client,important
!contact add "Jane Smith" +0987654321 --email jane@company.com --company "XYZ Ltd" --position "Director"
!contact add "Bob Johnson" +1122334455 --notes "Friend from college" --tags friend,personal`;
        }
        
        try {
          // Parse contact data
          const name = args[1];
          const phoneNumber = args[2];
          
          // Validate phone number
          if (!phoneNumber || !/^[+]?[0-9\s\-\(\)]+$/.test(phoneNumber)) {
            return '❌ Please provide a valid phone number.';
          }
          
          // Parse options
          const options = {
            name: name,
            phoneNumber: phoneNumber,
            email: null,
            address: null,
            company: null,
            position: null,
            birthday: null,
            notes: null,
            tags: []
          };
          
          // Parse --email option
          const emailIndex = args.indexOf('--email');
          if (emailIndex !== -1 && args[emailIndex + 1]) {
            const email = args[emailIndex + 1];
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              options.email = email;
            } else {
              return '❌ Please provide a valid email address.';
            }
          }
          
          // Parse --company option
          const companyIndex = args.indexOf('--company');
          if (companyIndex !== -1 && args[companyIndex + 1]) {
            options.company = args[companyIndex + 1];
          }
          
          // Parse --position option
          const positionIndex = args.indexOf('--position');
          if (positionIndex !== -1 && args[positionIndex + 1]) {
            options.position = args[positionIndex + 1];
          }
          
          // Parse --birthday option
          const birthdayIndex = args.indexOf('--birthday');
          if (birthdayIndex !== -1 && args[birthdayIndex + 1]) {
            const birthday = args[birthdayIndex + 1];
            if (/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
              options.birthday = birthday;
            } else {
              return '❌ Birthday must be in YYYY-MM-DD format.';
            }
          }
          
          // Parse --notes option
          const notesIndex = args.indexOf('--notes');
          if (notesIndex !== -1 && args[notesIndex + 1]) {
            options.notes = args[notesIndex + 1];
          }
          
          // Parse --tags option
          const tagsIndex = args.indexOf('--tags');
          if (tagsIndex !== -1 && args[tagsIndex + 1]) {
            options.tags = args[tagsIndex + 1].split(',').map(tag => tag.trim().toLowerCase());
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Adding contact: ${name}...` 
          });
          
          const contactId = await contactService.addContact(userId, options);
          
          return `✅ Contact added successfully!
🆔 ID: ${contactId}
👤 Name: ${name}
📞 Phone: ${phoneNumber}
${options.email ? `📧 Email: ${options.email}` : ''}
${options.company ? `🏢 Company: ${options.company}` : ''}
${options.position ? `💼 Position: ${options.position}` : ''}
${options.birthday ? `🎂 Birthday: ${options.birthday}` : ''}
${options.notes ? `📝 Notes: ${options.notes.substring(0, 50)}${options.notes.length > 50 ? '...' : ''}` : ''}
${options.tags.length > 0 ? `🏷️ Tags: ${options.tags.join(', ')}` : ''}`;
        } catch (error) {
          Logger.error(`Contact add error: ${error.message}`);
          return `❌ Failed to add contact: ${error.message}`;
        }

      case 'list':
        try {
          // Parse options
          const options = {
            limit: 20,
            offset: 0,
            sortBy: 'name',
            sortOrder: 'ASC',
            search: null,
            tags: null,
            company: null,
            group: null
          };
          
          // Parse --search option
          const searchIndex = args.indexOf('--search');
          if (searchIndex !== -1 && args[searchIndex + 1]) {
            options.search = args[searchIndex + 1];
          }
          
          // Parse --tags option
          const tagsIndex = args.indexOf('--tags');
          if (tagsIndex !== -1 && args[tagsIndex + 1]) {
            options.tags = args[tagsIndex + 1].split(',').map(tag => tag.trim().toLowerCase());
          }
          
          // Parse --company option
          const companyIndex = args.indexOf('--company');
          if (companyIndex !== -1 && args[companyIndex + 1]) {
            options.company = args[companyIndex + 1];
          }
          
          // Parse --group option
          const groupIndex = args.indexOf('--group');
          if (groupIndex !== -1 && args[groupIndex + 1]) {
            options.group = args[groupIndex + 1];
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting contact list${options.search ? ` for "${options.search}"` : ''}...` 
          });
          
          const contacts = await contactService.getUserContacts(userId, options);
          
          return contactService.formatContactList(contacts);
        } catch (error) {
          Logger.error(`Contact list error: ${error.message}`);
          return `❌ Failed to get contact list: ${error.message}`;
        }

      case 'view':
        if (args.length < 2) {
          return '❌ Usage: !contact view <contact_id>';
        }
        
        try {
          const contactId = parseInt(args[1]);
          if (isNaN(contactId)) {
            return '❌ Please provide a valid contact ID.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting contact details for #${contactId}...` 
          });
          
          const contact = await contactService.getContact(contactId, userId);
          
          if (!contact) {
            return `❌ Contact #${contactId} not found or access denied.`;
          }
          
          return contactService.formatContact(contact);
        } catch (error) {
          Logger.error(`Contact view error: ${error.message}`);
          return `❌ Failed to get contact details: ${error.message}`;
        }

      case 'update':
        if (args.length < 4) {
          return `❌ Usage: !contact update <contact_id> <field> <value>
          
Fields: name, phone_number, email, address, company, position, birthday, notes

Examples:
!contact update 123 name "John Smith"
!contact update 123 email john.smith@newcompany.com
!contact update 123 company "New Company Ltd"
!contact update 123 position "Senior Manager"
!contact update 123 birthday 1990-01-01
!contact update 123 notes "Updated client information"
!contact update 123 phone_number +1987654321`;
        }
        
        try {
          const contactId = parseInt(args[1]);
          const field = args[2].toLowerCase();
          const value = args.slice(3).join(' ');
          
          if (isNaN(contactId)) {
            return '❌ Please provide a valid contact ID.';
          }
          
          // Validate field
          const validFields = ['name', 'phone_number', 'email', 'address', 'company', 'position', 'birthday', 'notes'];
          if (!validFields.includes(field)) {
            return `❌ Invalid field. Valid fields: ${validFields.join(', ')}`;
          }
          
          // Validate value based on field
          if (field === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return '❌ Please provide a valid email address.';
          }
          
          if (field === 'birthday' && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return '❌ Birthday must be in YYYY-MM-DD format.';
          }
          
          if (field === 'phone_number' && value && !/^[+]?[0-9\s\-\(\)]+$/.test(value)) {
            return '❌ Please provide a valid phone number.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Updating contact #${contactId} ${field} to "${value}"...` 
          });
          
          const updates = {};
          updates[field] = value;
          
          const updatedContact = await contactService.updateContact(contactId, userId, updates);
          
          return updatedContact ? 
            `✅ Contact #${contactId} updated successfully!
📝 ${field}: ${value}` : 
            `❌ Failed to update contact #${contactId}. Contact not found or access denied.`;
        } catch (error) {
          Logger.error(`Contact update error: ${error.message}`);
          return `❌ Failed to update contact: ${error.message}`;
        }

      case 'delete':
        if (args.length < 2) {
          return '❌ Usage: !contact delete <contact_id>';
        }
        
        try {
          const contactId = parseInt(args[1]);
          if (isNaN(contactId)) {
            return '❌ Please provide a valid contact ID.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Deleting contact #${contactId}...` 
          });
          
          const success = await contactService.deleteContact(contactId, userId);
          
          return success ? 
            `✅ Contact #${contactId} deleted successfully!` : 
            `❌ Failed to delete contact #${contactId}. Contact not found or access denied.`;
        } catch (error) {
          Logger.error(`Contact delete error: ${error.message}`);
          return `❌ Failed to delete contact: ${error.message}`;
        }

      case 'search':
        if (args.length < 2) {
          return '❌ Usage: !contact search <query>';
        }
        
        try {
          const query = args.slice(1).join(' ');
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔍 Searching contacts for "${query}"...` 
          });
          
          const contacts = await contactService.searchContacts(userId, query, {
            limit: 20
          });
          
          if (contacts.length === 0) {
            return `🔍 No contacts found matching "${query}".`;
          }
          
          return contactService.formatContactList(contacts);
        } catch (error) {
          Logger.error(`Contact search error: ${error.message}`);
          return `❌ Failed to search contacts: ${error.message}`;
        }

      case 'tags':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting your contact tags...` 
          });
          
          const tags = await contactService.getUserTags(userId);
          
          if (tags.length === 0) {
            return `🏷️ You don't have any contact tags yet.
            
Add tags to contacts with: !contact add-tag <contact_id> <tag>

Examples:
!contact add-tag 123 client
!contact add-tag 123 important
!contact add-tag 123 work
!contact add-tag 123 personal`;
          }
          
          let response = `🏷️ *Your Contact Tags* (${tags.length})\n\n`;
          
          tags.slice(0, 20).forEach((tag, index) => {
            response += `${index + 1}. ${tag.tag} (${tag.count} contacts)\n`;
          });
          
          if (tags.length > 20) {
            response += `... and ${tags.length - 20} more tags`;
          }
          
          return response;
        } catch (error) {
          Logger.error(`Contact tags error: ${error.message}`);
          return `❌ Failed to get your contact tags: ${error.message}`;
        }

      case 'add-tag':
        if (args.length < 3) {
          return '❌ Usage: !contact add-tag <contact_id> <tag>';
        }
        
        try {
          const contactId = parseInt(args[1]);
          const tag = args[2].toLowerCase();
          
          if (isNaN(contactId)) {
            return '❌ Please provide a valid contact ID.';
          }
          
          if (!tag || tag.trim() === '') {
            return '❌ Please provide a valid tag.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Adding tag "${tag}" to contact #${contactId}...` 
          });
          
          await contactService.addContactTags(contactId, [tag]);
          
          return `✅ Added tag "${tag}" to contact #${contactId} successfully!`;
        } catch (error) {
          Logger.error(`Contact add-tag error: ${error.message}`);
          return `❌ Failed to add tag: ${error.message}`;
        }

      case 'remove-tag':
        if (args.length < 3) {
          return '❌ Usage: !contact remove-tag <contact_id> <tag>';
        }
        
        try {
          const contactId = parseInt(args[1]);
          const tag = args[2].toLowerCase();
          
          if (isNaN(contactId)) {
            return '❌ Please provide a valid contact ID.';
          }
          
          if (!tag || tag.trim() === '') {
            return '❌ Please provide a valid tag.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Removing tag "${tag}" from contact #${contactId}...` 
          });
          
          const success = await contactService.removeContactTag(contactId, tag);
          
          return success ? 
            `✅ Removed tag "${tag}" from contact #${contactId} successfully!` : 
            `❌ Failed to remove tag "${tag}" from contact #${contactId}.`;
        } catch (error) {
          Logger.error(`Contact remove-tag error: ${error.message}`);
          return `❌ Failed to remove tag: ${error.message}`;
        }

      case 'reminder':
        if (args.length < 5) {
          return `❌ Usage: !contact reminder <contact_id> <type> <message> <due_date> [--recurring <interval>]
          
Types: call, meeting, follow_up, birthday, other

Examples:
!contact reminder 123 call "Follow up on project" "2025-12-25 14:30"
!contact reminder 123 meeting "Client meeting" "14:30" --recurring 1w
!contact reminder 123 follow_up "Check proposal status" "+3d"
!contact reminder 123 birthday "Wish happy birthday" "2025-01-01"
!contact reminder 123 other "Send documents" "2025-12-30 10:00"`;
        }
        
        try {
          const contactId = parseInt(args[1]);
          const reminderType = args[2].toLowerCase();
          const message = args[3];
          const dueDateStr = args[4];
          
          if (isNaN(contactId)) {
            return '❌ Please provide a valid contact ID.';
          }
          
          const validTypes = ['call', 'meeting', 'follow_up', 'birthday', 'other'];
          if (!validTypes.includes(reminderType)) {
            return `❌ Invalid reminder type. Valid types: ${validTypes.join(', ')}`;
          }
          
          // Parse due date
          let dueDate;
          if (dueDateStr.includes('-') && dueDateStr.includes(':')) {
            // Full datetime: YYYY-MM-DD HH:MM
            dueDate = new Date(dueDateStr);
          } else if (dueDateStr.includes('-')) {
            // Date only: YYYY-MM-DD
            dueDate = new Date(`${dueDateStr} 09:00`);
          } else if (dueDateStr.includes(':')) {
            // Time only: HH:MM (today)
            const today = new Date();
            const [hours, minutes] = dueDateStr.split(':');
            dueDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
          } else if (dueDateStr.startsWith('+')) {
            // Relative time: +3d, +1w, etc.
            const offsetMatch = dueDateStr.match(/^(\+\d+)([dwmy])$/);
            if (offsetMatch) {
              const amount = parseInt(offsetMatch[1].replace('+', ''));
              const unit = offsetMatch[2];
              const now = new Date();
              
              switch (unit) {
                case 'd': // days
                  dueDate = new Date(now.setDate(now.getDate() + amount));
                  break;
                case 'w': // weeks
                  dueDate = new Date(now.setDate(now.getDate() + (amount * 7)));
                  break;
                case 'm': // months
                  dueDate = new Date(now.setMonth(now.getMonth() + amount));
                  break;
                case 'y': // years
                  dueDate = new Date(now.setFullYear(now.getFullYear() + amount));
                  break;
              }
            }
          }
          
          if (!dueDate || isNaN(dueDate.getTime())) {
            return '❌ Invalid due date format. Use YYYY-MM-DD HH:MM, YYYY-MM-DD, HH:MM, or +3d/+1w/+1m/+1y';
          }
          
          if (dueDate < new Date()) {
            return '❌ Cannot set reminders in the past.';
          }
          
          // Parse --recurring option
          let recurring = false;
          let interval = null;
          
          const recurringIndex = args.indexOf('--recurring');
          if (recurringIndex !== -1 && args[recurringIndex + 1]) {
            recurring = true;
            interval = args[recurringIndex + 1];
            
            // Validate interval format
            if (!/^(\d+)([dwmy])$/.test(interval)) {
              return '❌ Invalid interval format. Use format like 1d, 1w, 1m, 1y';
            }
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Setting ${reminderType} reminder for contact #${contactId}...` 
          });
          
          const reminderId = await contactService.setContactReminder(userId, contactId, {
            reminderType: reminderType,
            message: message,
            dueDate: dueDate.toISOString(),
            recurring: recurring,
            interval: interval
          });
          
          return `✅ ${reminderType.charAt(0).toUpperCase() + reminderType.slice(1)} reminder set successfully!
🆔 ID: ${reminderId}
👤 Contact: #${contactId}
📝 Message: ${message}
📅 Due: ${dueDate.toLocaleString()}
${recurring ? `🔁 Recurring: Every ${interval}` : ''}`;
        } catch (error) {
          Logger.error(`Contact reminder error: ${error.message}`);
          return `❌ Failed to set contact reminder: ${error.message}`;
        }

      case 'reminders':
        try {
          // Parse --upcoming option
          const upcomingOnly = args.includes('--upcoming');
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting your contact reminders${upcomingOnly ? ' (upcoming)' : ''}...` 
          });
          
          const reminders = await contactService.getUserReminders(userId, {
            limit: 20,
            upcomingOnly: upcomingOnly
          });
          
          return contactService.formatReminderList(reminders);
        } catch (error) {
          Logger.error(`Contact reminders error: ${error.message}`);
          return `❌ Failed to get your contact reminders: ${error.message}`;
        }

      case 'remove-reminder':
        if (args.length < 2) {
          return '❌ Usage: !contact remove-reminder <reminder_id>';
        }
        
        try {
          const reminderId = parseInt(args[1]);
          if (isNaN(reminderId)) {
            return '❌ Please provide a valid reminder ID.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Removing reminder #${reminderId}...` 
          });
          
          const success = await contactService.removeContactReminder(reminderId, userId);
          
          return success ? 
            `✅ Reminder #${reminderId} removed successfully!` : 
            `❌ Failed to remove reminder #${reminderId}. Reminder not found or access denied.`;
        } catch (error) {
          Logger.error(`Contact remove-reminder error: ${error.message}`);
          return `❌ Failed to remove reminder: ${error.message}`;
        }

      case 'birthdays':
        try {
          // Parse --days option
          let days = 30;
          const daysIndex = args.indexOf('--days');
          if (daysIndex !== -1 && args[daysIndex + 1]) {
            days = parseInt(args[daysIndex + 1]);
            if (isNaN(days) || days < 1 || days > 365) {
              return '❌ Days must be between 1 and 365.';
            }
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting upcoming birthdays (${days} days)...` 
          });
          
          const birthdays = await contactService.getUpcomingBirthdays(userId, days);
          
          if (birthdays.length === 0) {
            return `🎂 No birthdays in the next ${days} days.`;
          }
          
          let response = `🎂 *Upcoming Birthdays* (${birthdays.length} in next ${days} days)\n\n`;
          
          birthdays.slice(0, 15).forEach((contact, index) => {
            const birthday = new Date(contact.birthday);
            const today = new Date();
            const daysUntil = Math.ceil((birthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            response += `${index + 1}. ${contact.name}
📞 ${contact.phone_number}
🎂 ${birthday.toLocaleDateString()} (${daysUntil} day${daysUntil !== 1 ? 's' : ''})
📅 Age: ${today.getFullYear() - birthday.getFullYear()} years old\n\n`;
          });
          
          if (birthdays.length > 15) {
            response += `... and ${birthdays.length - 15} more birthdays`;
          }
          
          return response;
        } catch (error) {
          Logger.error(`Contact birthdays error: ${error.message}`);
          return `❌ Failed to get upcoming birthdays: ${error.message}`;
        }

      case 'groups':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting your contact groups...` 
          });
          
          const groups = await contactService.getContactGroups(userId);
          
          if (groups.length === 0) {
            return `📁 You don't have any contact groups yet.
            
Create groups with: !contact create-group <name> [description]

Examples:
!contact create-group "Clients" "Important business contacts"
!contact create-group "Friends" "Personal friends"
!contact create-group "Family" "Family members"`;
          }
          
          let response = `📁 *Your Contact Groups* (${groups.length})\n\n`;
          
          groups.slice(0, 15).forEach((group, index) => {
            response += `${index + 1}. ${group.name}
🆔 ${group.id}
📝 ${group.description || 'No description'}
📅 Created: ${new Date(group.created_at).toLocaleDateString()}\n\n`;
          });
          
          if (groups.length > 15) {
            response += `... and ${groups.length - 15} more groups`;
          }
          
          return response;
        } catch (error) {
          Logger.error(`Contact groups error: ${error.message}`);
          return `❌ Failed to get your contact groups: ${error.message}`;
        }

      case 'create-group':
        if (args.length < 2) {
          return `❌ Usage: !contact create-group <name> [description]
          
Examples:
!contact create-group "Clients" "Important business contacts"
!contact create-group "Friends" "Personal friends"
!contact create-group "Family" "Family members"`;
        }
        
        try {
          const name = args[1];
          const description = args.slice(2).join(' ') || null;
          
          if (!name || name.trim() === '') {
            return '❌ Please provide a group name.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Creating contact group "${name}"...` 
          });
          
          const groupId = await contactService.createContactGroup(userId, name, description);
          
          return groupId ? 
            `✅ Contact group "${name}" created successfully!
🆔 ID: ${groupId}
📝 Description: ${description || 'No description'}` : 
            `❌ Failed to create contact group "${name}".`;
        } catch (error) {
          Logger.error(`Contact create-group error: ${error.message}`);
          return `❌ Failed to create contact group: ${error.message}`;
        }

      case 'add-to-group':
        if (args.length < 3) {
          return '❌ Usage: !contact add-to-group <contact_id> <group_id>';
        }
        
        try {
          const contactId = parseInt(args[1]);
          const groupId = parseInt(args[2]);
          
          if (isNaN(contactId) || isNaN(groupId)) {
            return '❌ Please provide valid contact and group IDs.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Adding contact #${contactId} to group #${groupId}...` 
          });
          
          const success = await contactService.addContactToGroup(contactId, groupId, userId);
          
          return success ? 
            `✅ Added contact #${contactId} to group #${groupId} successfully!` : 
            `❌ Failed to add contact #${contactId} to group #${groupId}. Contact or group not found or access denied.`;
        } catch (error) {
          Logger.error(`Contact add-to-group error: ${error.message}`);
          return `❌ Failed to add contact to group: ${error.message}`;
        }

      case 'remove-from-group':
        if (args.length < 3) {
          return '❌ Usage: !contact remove-from-group <contact_id> <group_id>';
        }
        
        try {
          const contactId = parseInt(args[1]);
          const groupId = parseInt(args[2]);
          
          if (isNaN(contactId) || isNaN(groupId)) {
            return '❌ Please provide valid contact and group IDs.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Removing contact #${contactId} from group #${groupId}...` 
          });
          
          const success = await contactService.removeContactFromGroup(contactId, groupId, userId);
          
          return success ? 
            `✅ Removed contact #${contactId} from group #${groupId} successfully!` : 
            `❌ Failed to remove contact #${contactId} from group #${groupId}. Contact or group not found or access denied.`;
        } catch (error) {
          Logger.error(`Contact remove-from-group error: ${error.message}`);
          return `❌ Failed to remove contact from group: ${error.message}`;
        }

      case 'group':
        if (args.length < 2) {
          return '❌ Usage: !contact group <group_id>';
        }
        
        try {
          const groupId = parseInt(args[1]);
          
          if (isNaN(groupId)) {
            return '❌ Please provide a valid group ID.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting group #${groupId} details...` 
          });
          
          const group = await database.db.get(`
            SELECT * FROM contact_groups 
            WHERE id = ? AND user_jid = ?
          `, [groupId, userId]);
          
          if (!group) {
            return `❌ Group #${groupId} not found or access denied.`;
          }
          
          const groupContacts = await contactService.getGroupContacts(groupId, userId);
          
          let response = `📁 *Group: ${group.name}*
          
🆔 ID: ${group.id}
📝 Description: ${group.description || 'No description'}
📅 Created: ${new Date(group.created_at).toLocaleDateString()}
👥 Members: ${groupContacts.length}\n\n`;
          
          if (groupContacts.length > 0) {
            response += `👥 *Group Members* (${groupContacts.length})\n\n`;
            
            groupContacts.slice(0, 10).forEach((contact, index) => {
              response += `${index + 1}. ${contact.name}
📞 ${contact.phone_number}
📧 ${contact.email || 'N/A'}
🏢 ${contact.company || 'N/A'}${contact.position ? ` - ${contact.position}` : ''}
📍 ${contact.address || 'N/A'}\n\n`;
            });
            
            if (groupContacts.length > 10) {
              response += `... and ${groupContacts.length - 10} more members`;
            }
          }
          
          return response;
        } catch (error) {
          Logger.error(`Contact group error: ${error.message}`);
          return `❌ Failed to get group details: ${error.message}`;
        }

      case 'portfolio':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting your contact portfolio...` 
          });
          
          const portfolio = await contactService.getPortfolio(userId);
          
          if (portfolio.length === 0) {
            return `💼 Your contact portfolio is empty.
            
Add contacts to your portfolio with: !contact add-to-portfolio <contact_id>

Examples:
!contact add-to-portfolio 123
!contact add-to-portfolio 456
!contact add-to-portfolio 789`;
          }
          
          let response = `💼 *Your Contact Portfolio* (${portfolio.length})\n\n`;
          
          portfolio.slice(0, 15).forEach((item, index) => {
            response += `${index + 1}. ${item.name}
🆔 ${item.id}
📞 ${item.phone_number}
📧 ${item.email || 'N/A'}
🏢 ${item.company || 'N/A'}${item.position ? ` - ${item.position}` : ''}
📍 ${item.address || 'N/A'}
📅 Added: ${new Date(item.added_at).toLocaleDateString()}\n\n`;
          });
          
          if (portfolio.length > 15) {
            response += `... and ${portfolio.length - 15} more portfolio items`;
          }
          
          return response;
        } catch (error) {
          Logger.error(`Contact portfolio error: ${error.message}`);
          return `❌ Failed to get your contact portfolio: ${error.message}`;
        }

      case 'add-to-portfolio':
        if (args.length < 2) {
          return '❌ Usage: !contact add-to-portfolio <contact_id>';
        }
        
        try {
          const contactId = parseInt(args[1]);
          
          if (isNaN(contactId)) {
            return '❌ Please provide a valid contact ID.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Adding contact #${contactId} to your portfolio...` 
          });
          
          const portfolioId = await contactService.addToPortfolio(userId, contactId);
          
          return portfolioId ? 
            `✅ Added contact #${contactId} to your portfolio successfully!
🆔 Portfolio ID: ${portfolioId}` : 
            `❌ Failed to add contact #${contactId} to your portfolio.`;
        } catch (error) {
          Logger.error(`Contact add-to-portfolio error: ${error.message}`);
          return `❌ Failed to add to portfolio: ${error.message}`;
        }

      case 'remove-from-portfolio':
        if (args.length < 2) {
          return '❌ Usage: !contact remove-from-portfolio <portfolio_id>';
        }
        
        try {
          const portfolioId = parseInt(args[1]);
          
          if (isNaN(portfolioId)) {
            return '❌ Please provide a valid portfolio ID.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Removing item #${portfolioId} from your portfolio...` 
          });
          
          const success = await contactService.removeFromPortfolio(portfolioId, userId);
          
          return success ? 
            `✅ Removed item #${portfolioId} from your portfolio successfully!` : 
            `❌ Failed to remove item #${portfolioId} from your portfolio.`;
        } catch (error) {
          Logger.error(`Contact remove-from-portfolio error: ${error.message}`);
          return `❌ Failed to remove from portfolio: ${error.message}`;
        }

      case 'export':
        try {
          // Parse --format option
          let format = 'json';
          const formatIndex = args.indexOf('--format');
          if (formatIndex !== -1 && args[formatIndex + 1]) {
            format = args[formatIndex + 1].toLowerCase();
            if (!['json', 'csv'].includes(format)) {
              return '❌ Format must be "json" or "csv".';
            }
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Exporting your contacts as ${format.toUpperCase()}...` 
          });
          
          const exportResult = await contactService.exportContacts(userId, format);
          
          return `✅ Contacts exported successfully!
📁 Filename: ${exportResult.filename}
📊 Format: ${exportResult.format.toUpperCase()}
🔢 Count: ${exportResult.count}
📍 Path: ${exportResult.filepath}`;
        } catch (error) {
          Logger.error(`Contact export error: ${error.message}`);
          return `❌ Failed to export contacts: ${error.message}`;
        }

      case 'import':
        if (args.length < 2) {
          return `❌ Usage: !contact import <filepath> [--format json|csv]
          
Examples:
!contact import /path/to/contacts.json --format json
!contact import /path/to/contacts.csv --format csv`;
        }
        
        try {
          const filepath = args[1];
          
          // Parse --format option
          let format = 'json';
          const formatIndex = args.indexOf('--format');
          if (formatIndex !== -1 && args[formatIndex + 1]) {
            format = args[formatIndex + 1].toLowerCase();
            if (!['json', 'csv'].includes(format)) {
              return '❌ Format must be "json" or "csv".';
            }
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Importing contacts from ${filepath} as ${format.toUpperCase()}...` 
          });
          
          const importResult = await contactService.importContacts(userId, filepath, format);
          
          return `✅ Contacts imported successfully!
📊 Imported: ${importResult.imported}
❌ Failed: ${importResult.failed}
🔢 Total: ${importResult.total}`;
        } catch (error) {
          Logger.error(`Contact import error: ${error.message}`);
          return `❌ Failed to import contacts: ${error.message}`;
        }

      case 'sync':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Syncing with WhatsApp contacts...` 
          });
          
          // This would fetch actual WhatsApp contacts
          // For now, we'll simulate with sample data
          const whatsappContacts = [
            { name: 'John Doe', phoneNumber: '+1234567890' },
            { name: 'Jane Smith', phoneNumber: '+0987654321' },
            { name: 'Bob Johnson', phoneNumber: '+1122334455' },
            { name: 'Alice Brown', phoneNumber: '+5544332211' },
            { name: 'Charlie Wilson', phoneNumber: '+6677889900' }
          ];
          
          const syncResult = await contactService.syncWhatsAppContacts(userId, whatsappContacts);
          
          return `✅ WhatsApp contacts synced successfully!
📊 Synced: ${syncResult.synced}
🔄 Updated: ${syncResult.updated}
🔢 Total: ${syncResult.total}`;
        } catch (error) {
          Logger.error(`Contact sync error: ${error.message}`);
          return `❌ Failed to sync WhatsApp contacts: ${error.message}`;
        }

      case 'stats':
        try {
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting contact statistics...` 
          });
          
          const totalContacts = await database.db.get(`
            SELECT COUNT(*) as count FROM contacts 
            WHERE user_jid = ?
          `, [userId]);
          
          const totalGroups = await database.db.get(`
            SELECT COUNT(*) as count FROM contact_groups 
            WHERE user_jid = ?
          `, [userId]);
          
          const totalReminders = await database.db.get(`
            SELECT COUNT(*) as count FROM contact_reminders 
            WHERE user_jid = ?
          `, [userId]);
          
          const totalTags = await database.db.get(`
            SELECT COUNT(DISTINCT ct.tag) as count
            FROM contact_tags ct
            JOIN contacts c ON ct.contact_id = c.id
            WHERE c.user_jid = ?
          `, [userId]);
          
          const recentContacts = await database.db.get(`
            SELECT COUNT(*) as count 
            FROM contacts 
            WHERE user_jid = ? 
            AND created_at > datetime('now', '-7 days')
          `, [userId]);
          
          const activeReminders = await database.db.get(`
            SELECT COUNT(*) as count 
            FROM contact_reminders 
            WHERE user_jid = ? AND active = 1
          `, [userId]);
          
          return `📊 *Contact Statistics*
          
📇 Total Contacts: ${totalContacts.count}
📁 Total Groups: ${totalGroups.count}
🔔 Total Reminders: ${totalReminders.count}
🏷️ Unique Tags: ${totalTags.count}
👥 Recent Contacts (7d): ${recentContacts.count}
⏰ Active Reminders: ${activeReminders.count}`;
        } catch (error) {
          Logger.error(`Contact stats error: ${error.message}`);
          return `❌ Failed to get contact statistics: ${error.message}`;
        }

      default:
        return `❌ Unknown subcommand: ${subcommand}
        
Type !contact help for available commands`;
    }
  }
};