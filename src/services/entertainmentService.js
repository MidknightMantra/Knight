/**
 * Knight Entertainment Service
 * Comprehensive movie and TV show tracking system
 */

const Logger = require('../utils/logger');
const database = require('../database');
const https = require('https');

class EntertainmentService {
  constructor() {
    this.cache = new Map(); // Cache for entertainment data
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes cache
    this.tmdbApiKey = process.env.TMDB_API_KEY;
    this.omdbApiKey = process.env.OMDB_API_KEY;
  }

  async initialize() {
    try {
      Logger.success('Entertainment service initialized');
    } catch (error) {
      Logger.error(`Entertainment service initialization failed: ${error.message}`);
    }
  }

  async searchMovies(query, options = {}) {
    try {
      const {
        year = null,
        genre = null,
        language = 'en',
        sortBy = 'popularity.desc',
        includeAdult = false,
        page = 1,
        limit = 20
      } = options;

      // Check cache first
      const cacheKey = `movies_${query}_${year}_${genre}_${language}_${sortBy}_${page}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        Logger.info(`Returning cached movie search for ${query}`);
        return cached.data;
      }

      let results;
      
      if (this.tmdbApiKey) {
        results = await this.searchMoviesTMDB(query, options);
      } else if (this.omdbApiKey) {
        results = await this.searchMoviesOMDB(query, options);
      } else {
        results = this.searchMoviesLocal(query, options);
      }

      // Cache the result
      this.cache.set(cacheKey, {
         results,
        timestamp: Date.now()
      });

      return results.slice(0, limit);
    } catch (error) {
      Logger.error(`Movie search error: ${error.message}`);
      
      // Fallback to local search
      const results = this.searchMoviesLocal(query, options);
      return results.slice(0, options.limit || 20);
    }
  }

  async searchMoviesTMDB(query, options = {}) {
    try {
      const {
        year = null,
        genre = null,
        language = 'en',
        sortBy = 'popularity.desc',
        includeAdult = false,
        page = 1
      } = options;

      let apiUrl = `https://api.themoviedb.org/3/search/movie?api_key=${this.tmdbApiKey}&query=${encodeURIComponent(query)}&language=${language}&page=${page}&include_adult=${includeAdult}`;
      
      if (year) apiUrl += `&year=${year}`;
      if (genre) apiUrl += `&with_genres=${genre}`;
      if (sortBy) apiUrl += `&sort_by=${sortBy}`;

      const data = await this.fetchFromAPI(apiUrl);
      
      const movies = data.results.map(movie => ({
        id: movie.id,
        title: movie.title,
        originalTitle: movie.original_title,
        releaseDate: movie.release_date,
        overview: movie.overview,
        posterPath: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
        backdropPath: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null,
        popularity: movie.popularity,
        voteAverage: movie.vote_average,
        voteCount: movie.vote_count,
        genreIds: movie.genre_ids,
        genres: movie.genre_ids ? movie.genre_ids.map(id => this.getGenreName(id, 'movie')) : [],
        adult: movie.adult,
        video: movie.video,
        runtime: null, // Will be fetched in detailed view
        budget: null,
        revenue: null,
        status: null
      }));

      return movies;
    } catch (error) {
      Logger.error(`TMDB movie search error: ${error.message}`);
      throw new Error(`Failed to search movies via TMDB: ${error.message}`);
    }
  }

  async searchMoviesOMDB(query, options = {}) {
    try {
      const {
        year = null,
        type = 'movie',
        page = 1
      } = options;

      let apiUrl = `http://www.omdbapi.com/?apikey=${this.omdbApiKey}&s=${encodeURIComponent(query)}&type=${type}&page=${page}`;
      
      if (year) apiUrl += `&y=${year}`;

      const data = await this.fetchFromAPI(apiUrl);
      
      if (data.Response === 'False') {
        return [];
      }

      const movies = data.Search.map(movie => ({
        id: movie.imdbID,
        title: movie.Title,
        year: movie.Year,
        type: movie.Type,
        poster: movie.Poster !== 'N/A' ? movie.Poster : null,
        imdbID: movie.imdbID
      }));

      return movies;
    } catch (error) {
      Logger.error(`OMDB movie search error: ${error.message}`);
      throw new Error(`Failed to search movies via OMDB: ${error.message}`);
    }
  }

  searchMoviesLocal(query, options = {}) {
    const {
      year = null,
      genre = null,
      limit = 20
    } = options;

    const queryLower = query.toLowerCase();
    
    // Sample movie database
    const movieDatabase = [
      {
        id: 'tt0111161',
        title: 'The Shawshank Redemption',
        year: '1994',
        genre: ['Drama'],
        director: 'Frank Darabont',
        actors: 'Tim Robbins, Morgan Freeman, Bob Gunton',
        plot: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
        imdbRating: '9.3',
        runtime: '142 min',
        poster: 'https://m.media-amazon.com/images/M/MV5BNDE3ODcxYzMtY2YzZC00NmNlLWJiNDMtZDViZWM2MzIxZDY5XkEyXkFqcGdeQXVyNjAwNDUxODI@._V1_SX300.jpg',
        released: '14 Oct 1994',
        language: 'English',
        country: 'United States',
        awards: 'Nominated for 7 Oscars. 21 wins & 43 nominations total',
        boxOffice: '$28,767,189'
      },
      {
        id: 'tt0068646',
        title: 'The Godfather',
        year: '1972',
        genre: ['Crime', 'Drama'],
        director: 'Francis Ford Coppola',
        actors: 'Marlon Brando, Al Pacino, James Caan',
        plot: 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.',
        imdbRating: '9.2',
        runtime: '175 min',
        poster: 'https://m.media-amazon.com/images/M/MV5BM2MyNjYxNmUtYTAwNi00MTYxLWJmNWYtYzZlODY3ZTk3OTFlXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_SX300.jpg',
        released: '24 Mar 1972',
        language: 'English, Italian, Latin',
        country: 'United States',
        awards: 'Won 3 Oscars. 31 wins & 30 nominations total',
        boxOffice: '$136,318,500'
      },
      {
        id: 'tt0468569',
        title: 'The Dark Knight',
        year: '2008',
        genre: ['Action', 'Crime', 'Drama'],
        director: 'Christopher Nolan',
        actors: 'Christian Bale, Heath Ledger, Aaron Eckhart',
        plot: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
        imdbRating: '9.0',
        runtime: '152 min',
        poster: 'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_SX300.jpg',
        released: '18 Jul 2008',
        language: 'English, Mandarin',
        country: 'United Kingdom, United States',
        awards: 'Won 2 Oscars. 158 wins & 162 nominations total',
        boxOffice: '$535,234,431'
      },
      {
        id: 'tt0076759',
        title: 'Star Wars: Episode IV - A New Hope',
        year: '1977',
        genre: ['Action', 'Adventure', 'Fantasy'],
        director: 'George Lucas',
        actors: 'Mark Hamill, Harrison Ford, Carrie Fisher',
        plot: 'Luke Skywalker joins forces with a Jedi Knight, a cocky pilot, a Wookiee and two droids to save the galaxy from the Empire\'s world-destroying battle station.',
        imdbRating: '8.6',
        runtime: '121 min',
        poster: 'https://m.media-amazon.com/images/M/MV5BOTA5NjhiOTAtZWM0ZC00MWNhLThiMzEtZDFkOTk2OTU1ZDJkXkEyXkFqcGdeQXVyMTA4NDI1NTQx._V1_SX300.jpg',
        released: '25 May 1977',
        language: 'English',
        country: 'United States, United Kingdom',
        awards: 'Won 6 Oscars. 66 wins & 30 nominations total',
        boxOffice: '$460,998,507'
      },
      {
        id: 'tt0109830',
        title: 'Forrest Gump',
        year: '1994',
        genre: ['Drama', 'Romance'],
        director: 'Robert Zemeckis',
        actors: 'Tom Hanks, Robin Wright, Gary Sinise',
        plot: 'The presidencies of Kennedy and Johnson, the events of Vietnam, Watergate, and other historical events unfold as seen through the eyes of a man with low IQ but a big heart.',
        imdbRating: '8.8',
        runtime: '142 min',
        poster: 'https://m.media-amazon.com/images/M/MV5BNWIwODRlZTUtY2U3ZS00Yzg1LWJhNzYtMmZiYmEyNmU1NjMzXkEyXkFqcGdeQXVyMTQxNzMzNDI@._V1_SX300.jpg',
        released: '06 Jul 1994',
        language: 'English',
        country: 'United States',
        awards: 'Won 6 Oscars. 50 wins & 75 nominations total',
        boxOffice: '$330,252,182'
      }
    ];

    return movieDatabase.filter(movie => {
      const titleMatch = movie.title.toLowerCase().includes(queryLower);
      const yearMatch = year ? movie.year.includes(year) : true;
      const genreMatch = genre ? movie.genre.some(g => g.toLowerCase().includes(genre.toLowerCase())) : true;
      
      return (titleMatch || query === 'all') && yearMatch && genreMatch;
    }).slice(0, limit);
  }

  async getMovieDetails(movieId) {
    try {
      // Check cache first
      const cacheKey = `movie_${movieId}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        Logger.info(`Returning cached movie details for ${movieId}`);
        return cached.data;
      }

      let movie;
      
      if (this.tmdbApiKey) {
        movie = await this.getMovieDetailsTMDB(movieId);
      } else if (this.omdbApiKey) {
        movie = await this.getMovieDetailsOMDB(movieId);
      } else {
        // Use local database
        const localMovies = this.searchMoviesLocal('all');
        movie = localMovies.find(m => m.id === movieId);
        if (!movie) {
          throw new Error(`Movie ${movieId} not found`);
        }
      }

      // Cache the result
      this.cache.set(cacheKey, {
         movie,
        timestamp: Date.now()
      });

      return movie;
    } catch (error) {
      Logger.error(`Movie details error: ${error.message}`);
      throw new Error(`Failed to get movie details: ${error.message}`);
    }
  }

  async getMovieDetailsTMDB(movieId) {
    try {
      const apiUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${this.tmdbApiKey}&language=en-US&append_to_response=credits,videos,reviews,similar,recommendations`;
      
      const data = await this.fetchFromAPI(apiUrl);
      
      // Get credits (cast and crew)
      const cast = data.credits?.cast?.slice(0, 10).map(person => ({
        name: person.name,
        character: person.character,
        profilePath: person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : null
      })) || [];
      
      const crew = data.credits?.crew?.filter(person => 
        ['Director', 'Producer', 'Writer'].includes(person.job)
      ).map(person => ({
        name: person.name,
        job: person.job
      })) || [];
      
      // Get genres
      const genres = data.genres?.map(genre => genre.name) || [];
      
      // Get production companies
      const productionCompanies = data.production_companies?.map(company => company.name) || [];
      
      return {
        id: data.id,
        title: data.title,
        originalTitle: data.original_title,
        tagline: data.tagline,
        overview: data.overview,
        releaseDate: data.release_date,
        runtime: data.runtime,
        budget: data.budget,
        revenue: data.revenue,
        status: data.status,
        genres: genres,
        productionCompanies: productionCompanies,
        cast: cast,
        crew: crew,
        posterPath: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
        backdropPath: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : null,
        popularity: data.popularity,
        voteAverage: data.vote_average,
        voteCount: data.vote_count,
        imdbId: data.imdb_id,
        homepage: data.homepage,
        spokenLanguages: data.spoken_languages?.map(lang => lang.name) || [],
        productionCountries: data.production_countries?.map(country => country.name) || [],
        videos: data.videos?.results?.slice(0, 5).map(video => ({
          name: video.name,
          key: video.key,
          site: video.site,
          type: video.type,
          url: `https://www.youtube.com/watch?v=${video.key}`
        })) || [],
        similar: data.similar?.results?.slice(0, 5).map(similar => ({
          id: similar.id,
          title: similar.title,
          posterPath: similar.poster_path ? `https://image.tmdb.org/t/p/w185${similar.poster_path}` : null,
          voteAverage: similar.vote_average
        })) || [],
        recommendations: data.recommendations?.results?.slice(0, 5).map(rec => ({
          id: rec.id,
          title: rec.title,
          posterPath: rec.poster_path ? `https://image.tmdb.org/t/p/w185${rec.poster_path}` : null,
          voteAverage: rec.vote_average
        })) || []
      };
    } catch (error) {
      Logger.error(`TMDB movie details error: ${error.message}`);
      throw new Error(`Failed to get movie details via TMDB: ${error.message}`);
    }
  }

  async getMovieDetailsOMDB(movieId) {
    try {
      const apiUrl = `http://www.omdbapi.com/?apikey=${this.omdbApiKey}&i=${movieId}&plot=full`;
      
      const data = await this.fetchFromAPI(apiUrl);
      
      if (data.Response === 'False') {
        throw new Error(data.Error || 'Movie not found');
      }
      
      return {
        id: data.imdbID,
        title: data.Title,
        year: data.Year,
        rated: data.Rated,
        released: data.Released,
        runtime: data.Runtime,
        genre: data.Genre ? data.Genre.split(', ') : [],
        director: data.Director,
        writer: data.Writer,
        actors: data.Actors,
        plot: data.Plot,
        language: data.Language,
        country: data.Country,
        awards: data.Awards,
        poster: data.Poster !== 'N/A' ? data.Poster : null,
        ratings: data.Ratings ? data.Ratings.map(rating => ({
          source: rating.Source,
          value: rating.Value
        })) : [],
        metascore: data.Metascore,
        imdbRating: data.imdbRating,
        imdbVotes: data.imdbVotes,
        imdbID: data.imdbID,
        type: data.Type,
        dvd: data.DVD,
        boxOffice: data.BoxOffice,
        production: data.Production,
        website: data.Website
      };
    } catch (error) {
      Logger.error(`OMDB movie details error: ${error.message}`);
      throw new Error(`Failed to get movie details via OMDB: ${error.message}`);
    }
  }

  async searchTVShows(query, options = {}) {
    try {
      const {
        year = null,
        genre = null,
        language = 'en',
        page = 1,
        limit = 20
      } = options;

      // Check cache first
      const cacheKey = `tv_${query}_${year}_${genre}_${language}_${page}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        Logger.info(`Returning cached TV show search for ${query}`);
        return cached.data;
      }

      let results;
      
      if (this.tmdbApiKey) {
        results = await this.searchTVShowsTMDB(query, options);
      } else {
        results = this.searchTVShowsLocal(query, options);
      }

      // Cache the result
      this.cache.set(cacheKey, {
         results,
        timestamp: Date.now()
      });

      return results.slice(0, limit);
    } catch (error) {
      Logger.error(`TV show search error: ${error.message}`);
      
      // Fallback to local search
      const results = this.searchTVShowsLocal(query, options);
      return results.slice(0, options.limit || 20);
    }
  }

  async searchTVShowsTMDB(query, options = {}) {
    try {
      const {
        year = null,
        genre = null,
        language = 'en',
        page = 1
      } = options;

      let apiUrl = `https://api.themoviedb.org/3/search/tv?api_key=${this.tmdbApiKey}&query=${encodeURIComponent(query)}&language=${language}&page=${page}`;
      
      if (year) apiUrl += `&first_air_date_year=${year}`;
      if (genre) apiUrl += `&with_genres=${genre}`;

      const data = await this.fetchFromAPI(apiUrl);
      
      const tvShows = data.results.map(show => ({
        id: show.id,
        name: show.name,
        originalName: show.original_name,
        firstAirDate: show.first_air_date,
        overview: show.overview,
        posterPath: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : null,
        backdropPath: show.backdrop_path ? `https://image.tmdb.org/t/p/w1280${show.backdrop_path}` : null,
        popularity: show.popularity,
        voteAverage: show.vote_average,
        voteCount: show.vote_count,
        genreIds: show.genre_ids,
        genres: show.genre_ids ? show.genre_ids.map(id => this.getGenreName(id, 'tv')) : [],
        originCountry: show.origin_country,
        originalLanguage: show.original_language
      }));

      return tvShows;
    } catch (error) {
      Logger.error(`TMDB TV show search error: ${error.message}`);
      throw new Error(`Failed to search TV shows via TMDB: ${error.message}`);
    }
  }

  searchTVShowsLocal(query, options = {}) {
    const {
      year = null,
      genre = null,
      limit = 20
    } = options;

    const queryLower = query.toLowerCase();
    
    // Sample TV show database
    const tvDatabase = [
      {
        id: 1399,
        name: 'Game of Thrones',
        firstAirDate: '2011-04-17',
        overview: 'Nine noble families fight for control over the lands of Westeros, while an ancient enemy returns after being dormant for millennia.',
        genres: ['Sci-Fi & Fantasy', 'Drama', 'Action & Adventure'],
        posterPath: 'https://image.tmdb.org/t/p/w500/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg',
        voteAverage: 8.4,
        numberOfSeasons: 8,
        numberOfEpisodes: 73,
        status: 'Ended',
        networks: ['HBO'],
        createdBy: ['David Benioff', 'D. B. Weiss']
      },
      {
        id: 1402,
        name: 'The Walking Dead',
        firstAirDate: '2010-10-31',
        overview: 'Sheriff Deputy Rick Grimes wakes up from a coma to learn the world is overrun with zombies. He sets out to find his family and encounters many survivors along the way.',
        genres: ['Action & Adventure', 'Drama', 'Sci-Fi & Fantasy'],
        posterPath: 'https://image.tmdb.org/t/p/w500/reKfccHJiKm0sTQzPdr72u0T90Q.jpg',
        voteAverage: 8.1,
        numberOfSeasons: 11,
        numberOfEpisodes: 177,
        status: 'Ended',
        networks: ['AMC'],
        createdBy: ['Frank Darabont']
      },
      {
        id: 8285,
        name: 'Breaking Bad',
        firstAirDate: '2008-01-20',
        overview: 'A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine in order to secure his family\'s future.',
        genres: ['Crime', 'Drama', 'Thriller'],
        posterPath: 'https://image.tmdb.org/t/p/w500/1yeVJox3rjo2jBKrQ41d8jYApnD.jpg',
        voteAverage: 8.9,
        numberOfSeasons: 5,
        numberOfEpisodes: 62,
        status: 'Ended',
        networks: ['AMC'],
        createdBy: ['Vince Gilligan']
      },
      {
        id: 1412,
        name: 'Arrow',
        firstAirDate: '2012-10-10',
        overview: 'Spoiled billionaire playboy Oliver Queen is missing and presumed dead when his yacht is lost at sea. He returns five years later a changed man, determined to clean up the city as a hooded vigilante armed with a bow.',
        genres: ['Action & Adventure', 'Crime', 'Drama'],
        posterPath: 'https://image.tmdb.org/t/p/w500/gKG5QGz5Ngf8fgWpBSDrNAoAnVg.jpg',
        voteAverage: 7.5,
        numberOfSeasons: 8,
        numberOfEpisodes: 170,
        status: 'Ended',
        networks: ['The CW'],
        createdBy: ['Greg Berlanti', 'Marc Guggenheim', 'Andrew Kreisberg']
      },
      {
        id: 1416,
        name: 'Grey\'s Anatomy',
        firstAirDate: '2005-03-27',
        overview: 'Follows the personal and professional lives of a group of doctors at Seattle\'s Grey Sloan Memorial Hospital.',
        genres: ['Drama'],
        posterPath: 'https://image.tmdb.org/t/p/w500/clnyhPqjNlfCmdLbh8XNwkpJYGx.jpg',
        voteAverage: 8.2,
        numberOfSeasons: 20,
        numberOfEpisodes: 428,
        status: 'Returning Series',
        networks: ['ABC'],
        createdBy: ['Shonda Rhimes']
      }
    ];

    return tvDatabase.filter(show => {
      const nameMatch = show.name.toLowerCase().includes(queryLower);
      const yearMatch = year ? show.firstAirDate.includes(year) : true;
      const genreMatch = genre ? show.genres.some(g => g.toLowerCase().includes(genre.toLowerCase())) : true;
      
      return (nameMatch || query === 'all') && yearMatch && genreMatch;
    }).slice(0, limit);
  }

  async getTVShowDetails(showId) {
    try {
      // Check cache first
      const cacheKey = `tv_show_${showId}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        Logger.info(`Returning cached TV show details for ${showId}`);
        return cached.data;
      }

      let show;
      
      if (this.tmdbApiKey) {
        show = await this.getTVShowDetailsTMDB(showId);
      } else {
        // Use local database
        const localShows = this.searchTVShowsLocal('all');
        show = localShows.find(s => s.id === showId);
        if (!show) {
          throw new Error(`TV show ${showId} not found`);
        }
      }

      // Cache the result
      this.cache.set(cacheKey, {
         show,
        timestamp: Date.now()
      });

      return show;
    } catch (error) {
      Logger.error(`TV show details error: ${error.message}`);
      throw new Error(`Failed to get TV show details: ${error.message}`);
    }
  }

  async getTVShowDetailsTMDB(showId) {
    try {
      const apiUrl = `https://api.themoviedb.org/3/tv/${showId}?api_key=${this.tmdbApiKey}&language=en-US&append_to_response=credits,videos,reviews,seasons,similar,recommendations`;
      
      const data = await this.fetchFromAPI(apiUrl);
      
      // Get seasons
      const seasons = data.seasons?.map(season => ({
        seasonNumber: season.season_number,
        name: season.name,
        overview: season.overview,
        episodeCount: season.episode_count,
        airDate: season.air_date,
        posterPath: season.poster_path ? `https://image.tmdb.org/t/p/w185${season.poster_path}` : null
      })) || [];
      
      // Get cast and crew
      const cast = data.credits?.cast?.slice(0, 10).map(person => ({
        name: person.name,
        character: person.character,
        profilePath: person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : null
      })) || [];
      
      const crew = data.credits?.crew?.filter(person => 
        ['Creator', 'Executive Producer', 'Producer'].includes(person.job)
      ).map(person => ({
        name: person.name,
        job: person.job
      })) || [];
      
      // Get genres
      const genres = data.genres?.map(genre => genre.name) || [];
      
      // Get networks
      const networks = data.networks?.map(network => network.name) || [];
      
      return {
        id: data.id,
        name: data.name,
        originalName: data.original_name,
        overview: data.overview,
        firstAirDate: data.first_air_date,
        lastAirDate: data.last_air_date,
        numberOfSeasons: data.number_of_seasons,
        numberOfEpisodes: data.number_of_episodes,
        episodeRunTime: data.episode_run_time,
        genres: genres,
        status: data.status,
        networks: networks,
        createdBy: data.created_by?.map(creator => creator.name) || [],
        cast: cast,
        crew: crew,
        posterPath: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
        backdropPath: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : null,
        popularity: data.popularity,
        voteAverage: data.vote_average,
        voteCount: data.vote_count,
        homepage: data.homepage,
        inProduction: data.in_production,
        languages: data.languages,
        originCountry: data.origin_country,
        seasons: seasons,
        videos: data.videos?.results?.slice(0, 5).map(video => ({
          name: video.name,
          key: video.key,
          site: video.site,
          type: video.type,
          url: `https://www.youtube.com/watch?v=${video.key}`
        })) || [],
        similar: data.similar?.results?.slice(0, 5).map(similar => ({
          id: similar.id,
          name: similar.name,
          posterPath: similar.poster_path ? `https://image.tmdb.org/t/p/w185${similar.poster_path}` : null,
          voteAverage: similar.vote_average
        })) || [],
        recommendations: data.recommendations?.results?.slice(0, 5).map(rec => ({
          id: rec.id,
          name: rec.name,
          posterPath: rec.poster_path ? `https://image.tmdb.org/t/p/w185${rec.poster_path}` : null,
          voteAverage: rec.vote_average
        })) || []
      };
    } catch (error) {
      Logger.error(`TMDB TV show details error: ${error.message}`);
      throw new Error(`Failed to get TV show details via TMDB: ${error.message}`);
    }
  }

  async getTrending(options = {}) {
    try {
      const {
        mediaType = 'all', // all, movie, tv
        timeWindow = 'week', // day, week
        limit = 20
      } = options;

      // Check cache first
      const cacheKey = `trending_${mediaType}_${timeWindow}_${limit}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        Logger.info(`Returning cached trending ${mediaType} for ${timeWindow}`);
        return cached.data;
      }

      let results;
      
      if (this.tmdbApiKey) {
        results = await this.getTrendingTMDB(mediaType, timeWindow, limit);
      } else {
        results = this.getTrendingLocal(mediaType, timeWindow, limit);
      }

      // Cache the result
      this.cache.set(cacheKey, {
         results,
        timestamp: Date.now()
      });

      return results;
    } catch (error) {
      Logger.error(`Trending error: ${error.message}`);
      
      // Fallback to local trending
      const results = this.getTrendingLocal('all', 'week', 20);
      return results;
    }
  }

  async getTrendingTMDB(mediaType = 'all', timeWindow = 'week', limit = 20) {
    try {
      const apiUrl = `https://api.themoviedb.org/3/trending/${mediaType}/${timeWindow}?api_key=${this.tmdbApiKey}`;
      
      const data = await this.fetchFromAPI(apiUrl);
      
      const trending = data.results.slice(0, limit).map(item => ({
        id: item.id,
        title: item.title || item.name,
        mediaType: item.media_type,
        overview: item.overview,
        releaseDate: item.release_date || item.first_air_date,
        posterPath: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
        backdropPath: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : null,
        popularity: item.popularity,
        voteAverage: item.vote_average,
        voteCount: item.vote_count,
        adult: item.adult,
        video: item.video
      }));

      return trending;
    } catch (error) {
      Logger.error(`TMDB trending error: ${error.message}`);
      throw new Error(`Failed to get trending via TMDB: ${error.message}`);
    }
  }

  getTrendingLocal(mediaType = 'all', timeWindow = 'week', limit = 20) {
    // Sample trending data
    const trendingData = [
      {
        id: 'tt0111161',
        title: 'The Shawshank Redemption',
        mediaType: 'movie',
        overview: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
        releaseDate: '1994-10-14',
        posterPath: 'https://m.media-amazon.com/images/M/MV5BNDE3ODcxYzMtY2YzZC00NmNlLWJiNDMtZDViZWM2MzIxZDY5XkEyXkFqcGdeQXVyNjAwNDUxODI@._V1_SX300.jpg',
        backdropPath: 'https://image.tmdb.org/t/p/w1280/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
        popularity: 57.289,
        voteAverage: 9.3,
        voteCount: 25000
      },
      {
        id: 1399,
        title: 'Game of Thrones',
        mediaType: 'tv',
        overview: 'Nine noble families fight for control over the lands of Westeros, while an ancient enemy returns after being dormant for millennia.',
        releaseDate: '2011-04-17',
        posterPath: 'https://image.tmdb.org/t/p/w500/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg',
        backdropPath: 'https://image.tmdb.org/t/p/w1280/suopoADq0k8YZr4dQXcUkJKcbnJ.jpg',
        popularity: 364.472,
        voteAverage: 8.4,
        voteCount: 21000
      },
      {
        id: 'tt0068646',
        title: 'The Godfather',
        mediaType: 'movie',
        overview: 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.',
        releaseDate: '1972-03-24',
        posterPath: 'https://m.media-amazon.com/images/M/MV5BM2MyNjYxNmUtYTAwNi00MTYxLWJmNWYtYzZlODY3ZTk3OTFlXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_SX300.jpg',
        backdropPath: 'https://image.tmdb.org/t/p/w1280/iS9U3VHpPEjTWnwmW56CrBlpgLj.jpg',
        popularity: 87.523,
        voteAverage: 9.2,
        voteCount: 18000
      }
    ];

    return trendingData.slice(0, limit);
  }

  async getUpcomingMovies(options = {}) {
    try {
      const {
        region = 'US',
        language = 'en-US',
        page = 1,
        limit = 20
      } = options;

      // Check cache first
      const cacheKey = `upcoming_movies_${region}_${language}_${page}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        Logger.info(`Returning cached upcoming movies`);
        return cached.data;
      }

      let results;
      
      if (this.tmdbApiKey) {
        results = await this.getUpcomingMoviesTMDB(options);
      } else {
        results = this.getUpcomingMoviesLocal(options);
      }

      // Cache the result
      this.cache.set(cacheKey, {
         results,
        timestamp: Date.now()
      });

      return results.slice(0, limit);
    } catch (error) {
      Logger.error(`Upcoming movies error: ${error.message}`);
      
      // Fallback to local upcoming movies
      const results = this.getUpcomingMoviesLocal(options);
      return results.slice(0, options.limit || 20);
    }
  }

  async getUpcomingMoviesTMDB(options = {}) {
    try {
      const {
        region = 'US',
        language = 'en-US',
        page = 1
      } = options;

      const apiUrl = `https://api.themoviedb.org/3/movie/upcoming?api_key=${this.tmdbApiKey}&language=${language}&page=${page}&region=${region}`;
      
      const data = await this.fetchFromAPI(apiUrl);
      
      const movies = data.results.map(movie => ({
        id: movie.id,
        title: movie.title,
        overview: movie.overview,
        releaseDate: movie.release_date,
        posterPath: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
        backdropPath: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null,
        popularity: movie.popularity,
        voteAverage: movie.vote_average,
        voteCount: movie.vote_count,
        adult: movie.adult,
        video: movie.video,
        genreIds: movie.genre_ids,
        genres: movie.genre_ids ? movie.genre_ids.map(id => this.getGenreName(id, 'movie')) : []
      }));

      return movies;
    } catch (error) {
      Logger.error(`TMDB upcoming movies error: ${error.message}`);
      throw new Error(`Failed to get upcoming movies via TMDB: ${error.message}`);
    }
  }

  getUpcomingMoviesLocal(options = {}) {
    const {
      limit = 20
    } = options;

    // Sample upcoming movies data
    const upcomingMovies = [
      {
        id: 1,
        title: 'Sample Upcoming Movie 1',
        overview: 'An exciting upcoming movie with amazing visuals and storytelling.',
        releaseDate: '2025-12-25',
        posterPath: 'https://via.placeholder.com/500x750?text=Upcoming+Movie+1',
        backdropPath: 'https://via.placeholder.com/1280x720?text=Upcoming+Movie+1',
        popularity: 50.5,
        voteAverage: 0,
        voteCount: 0,
        adult: false,
        video: false,
        genres: ['Action', 'Adventure', 'Sci-Fi']
      },
      {
        id: 2,
        title: 'Sample Upcoming Movie 2',
        overview: 'A thrilling sequel that continues the epic story with stunning action sequences.',
        releaseDate: '2025-11-15',
        posterPath: 'https://via.placeholder.com/500x750?text=Upcoming+Movie+2',
        backdropPath: 'https://via.placeholder.com/1280x720?text=Upcoming+Movie+2',
        popularity: 45.2,
        voteAverage: 0,
        voteCount: 0,
        adult: false,
        video: false,
        genres: ['Action', 'Adventure', 'Fantasy']
      }
    ];

    return upcomingMovies.slice(0, limit);
  }

  async addToWatchlist(userId, mediaId, mediaType) {
    try {
      // Insert into database
      const result = await database.db.run(`
        INSERT OR IGNORE INTO entertainment_watchlist 
        (user_jid, media_id, media_type, added_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [userId, mediaId, mediaType]);
      
      const watchlistId = result.lastID;
      
      Logger.info(`Added ${mediaType} ${mediaId} to watchlist for user ${userId}`);
      return watchlistId;
    } catch (error) {
      Logger.error(`Failed to add to watchlist: ${error.message}`);
      throw new Error(`Failed to add to watchlist: ${error.message}`);
    }
  }

  async removeFromWatchlist(userId, mediaId) {
    try {
      await database.db.run(`
        DELETE FROM entertainment_watchlist 
        WHERE user_jid = ? AND media_id = ?
      `, [userId, mediaId]);
      
      Logger.info(`Removed ${mediaId} from watchlist for user ${userId}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to remove from watchlist: ${error.message}`);
      return false;
    }
  }

  async getWatchlist(userId) {
    try {
      const watchlist = await database.db.all(`
        SELECT * FROM entertainment_watchlist 
        WHERE user_jid = ?
        ORDER BY added_at DESC
        LIMIT 50
      `, [userId]);
      
      // Get detailed info for each item
      const detailedWatchlist = [];
      
      for (const item of watchlist) {
        try {
          let media;
          if (item.media_type === 'movie') {
            media = await this.getMovieDetails(item.media_id);
          } else if (item.media_type === 'tv') {
            media = await this.getTVShowDetails(item.media_id);
          }
          
          detailedWatchlist.push({
            ...item,
            media: media
          });
        } catch (error) {
          Logger.error(`Failed to get details for ${item.media_type} ${item.media_id}: ${error.message}`);
          detailedWatchlist.push({
            ...item,
            media: null
          });
        }
      }
      
      return detailedWatchlist;
    } catch (error) {
      Logger.error(`Failed to get watchlist: ${error.message}`);
      return [];
    }
  }

  async markAsWatched(userId, mediaId, mediaType, rating = null) {
    try {
      // Insert into watched table
      await database.db.run(`
        INSERT OR REPLACE INTO entertainment_watched 
        (user_jid, media_id, media_type, rating, watched_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [userId, mediaId, mediaType, rating]);
      
      // Remove from watchlist if it exists
      await database.db.run(`
        DELETE FROM entertainment_watchlist 
        WHERE user_jid = ? AND media_id = ?
      `, [userId, mediaId]);
      
      Logger.info(`Marked ${mediaType} ${mediaId} as watched for user ${userId}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to mark as watched: ${error.message}`);
      return false;
    }
  }

  async getWatched(userId) {
    try {
      const watched = await database.db.all(`
        SELECT * FROM entertainment_watched 
        WHERE user_jid = ?
        ORDER BY watched_at DESC
        LIMIT 50
      `, [userId]);
      
      return watched;
    } catch (error) {
      Logger.error(`Failed to get watched list: ${error.message}`);
      return [];
    }
  }

  async setEpisodeReminder(userId, showId, seasonNumber, episodeNumber, airDate) {
    try {
      // Insert into reminders table
      const result = await database.db.run(`
        INSERT INTO entertainment_reminders 
        (user_jid, show_id, season_number, episode_number, air_date, reminded, created_at)
        VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
      `, [userId, showId, seasonNumber, episodeNumber, airDate]);
      
      const reminderId = result.lastID;
      
      Logger.info(`Set episode reminder ${reminderId} for user ${userId}`);
      return reminderId;
    } catch (error) {
      Logger.error(`Failed to set episode reminder: ${error.message}`);
      throw new Error(`Failed to set episode reminder: ${error.message}`);
    }
  }

  async getEpisodeReminders(userId) {
    try {
      const reminders = await database.db.all(`
        SELECT * FROM entertainment_reminders 
        WHERE user_jid = ? AND reminded = 0 AND air_date > CURRENT_TIMESTAMP
        ORDER BY air_date ASC
        LIMIT 20
      `, [userId]);
      
      return reminders;
    } catch (error) {
      Logger.error(`Failed to get episode reminders: ${error.message}`);
      return [];
    }
  }

  async getRecommendations(userId, options = {}) {
    try {
      const {
        mediaType = 'all', // all, movie, tv
        limit = 10
      } = options;

      // Get user's watched history
      const watched = await this.getWatched(userId);
      
      if (watched.length === 0) {
        // Return trending if no watch history
        return await this.getTrending({ mediaType, limit });
      }
      
      // Get user's favorite genres from watch history
      const favoriteGenres = this.getFavoriteGenres(watched);
      
      // Get recommendations based on favorite genres
      let recommendations = [];
      
      if (this.tmdbApiKey) {
        // Use TMDB recommendations
        for (const genre of favoriteGenres.slice(0, 3)) {
          try {
            const genreRecommendations = await this.getGenreRecommendations(genre, mediaType, 5);
            recommendations = [...recommendations, ...genreRecommendations];
          } catch (error) {
            Logger.error(`Failed to get recommendations for genre ${genre}: ${error.message}`);
          }
        }
      } else {
        // Use local recommendations
        recommendations = this.getGenreRecommendationsLocal(favoriteGenres[0], mediaType, limit);
      }
      
      // Remove duplicates and watched items
      const uniqueRecommendations = [];
      const watchedIds = watched.map(item => item.media_id);
      
      for (const rec of recommendations) {
        if (!watchedIds.includes(rec.id) && !uniqueRecommendations.find(r => r.id === rec.id)) {
          uniqueRecommendations.push(rec);
        }
      }
      
      return uniqueRecommendations.slice(0, limit);
    } catch (error) {
      Logger.error(`Failed to get recommendations: ${error.message}`);
      
      // Fallback to trending
      return await this.getTrending({ mediaType, limit: 10 });
    }
  }

  getFavoriteGenres(watched) {
    // This would analyze watched items to determine favorite genres
    // For now, return some common genres
    return ['Action', 'Drama', 'Comedy', 'Sci-Fi', 'Fantasy'];
  }

  async getGenreRecommendations(genre, mediaType, limit) {
    try {
      // Get genre ID
      const genreId = this.getGenreId(genre, mediaType);
      
      if (!genreId) {
        throw new Error(`Genre ${genre} not found`);
      }
      
      const apiUrl = `https://api.themoviedb.org/3/discover/${mediaType === 'movie' ? 'movie' : 'tv'}?api_key=${this.tmdbApiKey}&with_genres=${genreId}&sort_by=popularity.desc&page=1`;
      
      const data = await this.fetchFromAPI(apiUrl);
      
      const recommendations = data.results.slice(0, limit).map(item => ({
        id: item.id,
        title: item.title || item.name,
        mediaType: mediaType === 'movie' ? 'movie' : 'tv',
        overview: item.overview,
        releaseDate: item.release_date || item.first_air_date,
        posterPath: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
        backdropPath: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : null,
        popularity: item.popularity,
        voteAverage: item.vote_average,
        voteCount: item.vote_count,
        genreIds: item.genre_ids,
        genres: item.genre_ids ? item.genre_ids.map(id => this.getGenreName(id, mediaType)) : []
      }));

      return recommendations;
    } catch (error) {
      Logger.error(`Failed to get genre recommendations: ${error.message}`);
      throw new Error(`Failed to get genre recommendations: ${error.message}`);
    }
  }

  getGenreRecommendationsLocal(genre, mediaType, limit) {
    // Sample recommendations
    const recommendations = [
      {
        id: 1,
        title: `Sample ${genre} Recommendation 1`,
        mediaType: mediaType,
        overview: `An exciting ${genre} production with great storytelling.`,
        releaseDate: '2025-01-01',
        posterPath: 'https://via.placeholder.com/500x750?text=Recommendation+1',
        backdropPath: 'https://via.placeholder.com/1280x720?text=Recommendation+1',
        popularity: 50.5,
        voteAverage: 7.5,
        voteCount: 1000,
        genres: [genre]
      },
      {
        id: 2,
        title: `Sample ${genre} Recommendation 2`,
        mediaType: mediaType,
        overview: `Another fantastic ${genre} title that audiences love.`,
        releaseDate: '2025-02-15',
        posterPath: 'https://via.placeholder.com/500x750?text=Recommendation+2',
        backdropPath: 'https://via.placeholder.com/1280x720?text=Recommendation+2',
        popularity: 45.2,
        voteAverage: 8.2,
        voteCount: 1500,
        genres: [genre]
      }
    ];

    return recommendations.slice(0, limit);
  }

  getGenreId(genreName, mediaType) {
    // Genre mapping for TMDB
    const movieGenres = {
      'action': 28,
      'adventure': 12,
      'animation': 16,
      'comedy': 35,
      'crime': 80,
      'documentary': 99,
      'drama': 18,
      'family': 10751,
      'fantasy': 14,
      'history': 36,
      'horror': 27,
      'music': 10402,
      'mystery': 9648,
      'romance': 10749,
      'science fiction': 878,
      'tv movie': 10770,
      'thriller': 53,
      'war': 10752,
      'western': 37
    };

    const tvGenres = {
      'action & adventure': 10759,
      'animation': 16,
      'comedy': 35,
      'crime': 80,
      'documentary': 99,
      'drama': 18,
      'family': 10751,
      'kids': 10762,
      'mystery': 9648,
      'news': 10763,
      'reality': 10764,
      'sci-fi & fantasy': 10765,
      'soap': 10766,
      'talk': 10767,
      'war & politics': 10768,
      'western': 37
    };

    const genres = mediaType === 'movie' ? movieGenres : tvGenres;
    return genres[genreName.toLowerCase()] || null;
  }

  getGenreName(genreId, mediaType) {
    // Reverse genre mapping for TMDB
    const movieGenres = {
      28: 'Action',
      12: 'Adventure',
      16: 'Animation',
      35: 'Comedy',
      80: 'Crime',
      99: 'Documentary',
      18: 'Drama',
      10751: 'Family',
      14: 'Fantasy',
      36: 'History',
      27: 'Horror',
      10402: 'Music',
      9648: 'Mystery',
      10749: 'Romance',
      878: 'Science Fiction',
      10770: 'TV Movie',
      53: 'Thriller',
      10752: 'War',
      37: 'Western'
    };

    const tvGenres = {
      10759: 'Action & Adventure',
      16: 'Animation',
      35: 'Comedy',
      80: 'Crime',
      99: 'Documentary',
      18: 'Drama',
      10751: 'Family',
      10762: 'Kids',
      9648: 'Mystery',
      10763: 'News',
      10764: 'Reality',
      10765: 'Sci-Fi & Fantasy',
      10766: 'Soap',
      10767: 'Talk',
      10768: 'War & Politics',
      37: 'Western'
    };

    const genres = mediaType === 'movie' ? movieGenres : tvGenres;
    return genres[genreId] || 'Unknown';
  }

  async fetchFromAPI(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            reject(new Error(`Failed to parse API response: ${error.message}`));
          }
        });
      }).on('error', (error) => {
        reject(new Error(`API request failed: ${error.message}`));
      });
    });
  }

  formatMovie(movie) {
    let response = `🎬 *${movie.title}*\n\n`;
    
    if (movie.posterPath) {
      response += `🖼️ [Poster: ${movie.posterPath}]\n\n`;
    }
    
    if (movie.overview) {
      response += `📝 *Overview:*\n${movie.overview}\n\n`;
    }
    
    if (movie.releaseDate) {
      response += `📅 *Release Date:* ${movie.releaseDate}\n`;
    }
    
    if (movie.runtime) {
      response += `⏱️ *Runtime:* ${movie.runtime} minutes\n`;
    }
    
    if (movie.genres && movie.genres.length > 0) {
      response += `🎭 *Genres:* ${movie.genres.join(', ')}\n`;
    }
    
    if (movie.voteAverage) {
      response += `⭐ *Rating:* ${movie.voteAverage}/10 (${movie.voteCount || 0} votes)\n`;
    }
    
    if (movie.director) {
      response += `🎥 *Director:* ${movie.director}\n`;
    }
    
    if (movie.actors) {
      response += `👥 *Cast:* ${movie.actors}\n`;
    }
    
    if (movie.boxOffice) {
      response += `💰 *Box Office:* ${movie.boxOffice}\n`;
    }
    
    if (movie.awards) {
      response += `🏆 *Awards:* ${movie.awards}\n`;
    }
    
    return response;
  }

  formatTVShow(show) {
    let response = `📺 *${show.name}*\n\n`;
    
    if (show.posterPath) {
      response += `🖼️ [Poster: ${show.posterPath}]\n\n`;
    }
    
    if (show.overview) {
      response += `📝 *Overview:*\n${show.overview}\n\n`;
    }
    
    if (show.firstAirDate) {
      response += `📅 *First Air Date:* ${show.firstAirDate}\n`;
    }
    
    if (show.lastAirDate) {
      response += `📅 *Last Air Date:* ${show.lastAirDate}\n`;
    }
    
    if (show.numberOfSeasons) {
      response += `シーズン *Seasons:* ${show.numberOfSeasons}\n`;
    }
    
    if (show.numberOfEpisodes) {
      response += `📺 *Episodes:* ${show.numberOfEpisodes}\n`;
    }
    
    if (show.genres && show.genres.length > 0) {
      response += `🎭 *Genres:* ${show.genres.join(', ')}\n`;
    }
    
    if (show.voteAverage) {
      response += `⭐ *Rating:* ${show.voteAverage}/10 (${show.voteCount || 0} votes)\n`;
    }
    
    if (show.createdBy && show.createdBy.length > 0) {
      response += `✍️ *Created By:* ${show.createdBy.join(', ')}\n`;
    }
    
    if (show.networks && show.networks.length > 0) {
      response += `📡 *Networks:* ${show.networks.join(', ')}\n`;
    }
    
    if (show.status) {
      response += `📊 *Status:* ${show.status}\n`;
    }
    
    return response;
  }

  formatSearchResults(results, type) {
    if (results.length === 0) {
      return `🎬 No ${type} found.`;
    }
    
    let response = `🎬 *${type.charAt(0).toUpperCase() + type.slice(1)} Search Results* (${results.length})\n\n`;
    
    results.slice(0, 10).forEach((item, index) => {
      const title = item.title || item.name;
      const date = item.releaseDate || item.firstAirDate || item.year;
      const rating = item.voteAverage || item.imdbRating;
      
      response += `${index + 1}. ${title}
📅 ${date || 'N/A'} | ⭐ ${rating || 'N/A'}${rating ? '/10' : ''}
🆔 ${item.id}
${item.overview ? `${item.overview.substring(0, 100)}${item.overview.length > 100 ? '...' : ''}\n\n` : ''}`;
    });
    
    if (results.length > 10) {
      response += `... and ${results.length - 10} more ${type}`;
    }
    
    return response;
  }

  formatWatchlist(watchlist) {
    if (watchlist.length === 0) {
      return `📋 Your watchlist is empty.
      
Add items with:
!entertainment watchlist add <movie_id>
!entertainment watchlist add <tv_id>`;
    }
    
    let response = `📋 *Your Watchlist* (${watchlist.length})\n\n`;
    
    watchlist.slice(0, 15).forEach((item, index) => {
      const media = item.media;
      const title = media ? (media.title || media.name) : 'Unknown Title';
      const date = media ? (media.releaseDate || media.firstAirDate || media.year) : 'Unknown Date';
      const rating = media ? (media.voteAverage || media.imdbRating) : 'N/A';
      
      response += `${index + 1}. ${title}
📅 ${date || 'N/A'} | ⭐ ${rating || 'N/A'}${rating ? '/10' : ''}
🎬 ${item.media_type.toUpperCase()} | 🆔 ${item.media_id}
📅 Added: ${new Date(item.added_at).toLocaleDateString()}\n\n`;
    });
    
    if (watchlist.length > 15) {
      response += `... and ${watchlist.length - 15} more items`;
    }
    
    return response;
  }

  formatRecommendations(recommendations) {
    if (recommendations.length === 0) {
      return `💡 No recommendations available.
      
Start watching movies/TV shows to get personalized recommendations.`;
    }
    
    let response = `💡 *Recommended for You* (${recommendations.length})\n\n`;
    
    recommendations.slice(0, 10).forEach((item, index) => {
      const title = item.title || item.name;
      const date = item.releaseDate || item.firstAirDate || item.year;
      const rating = item.voteAverage || item.imdbRating;
      
      response += `${index + 1}. ${title}
📅 ${date || 'N/A'} | ⭐ ${rating || 'N/A'}${rating ? '/10' : ''}
🎬 ${item.mediaType ? item.mediaType.toUpperCase() : 'MOVIE'} | 🆔 ${item.id}
${item.overview ? `${item.overview.substring(0, 100)}${item.overview.length > 100 ? '...' : ''}\n\n` : ''}`;
    });
    
    if (recommendations.length > 10) {
      response += `... and ${recommendations.length - 10} more recommendations`;
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
      Logger.info(`Cleaned up entertainment cache, ${this.cache.size} items remaining`);
    } catch (error) {
      Logger.error(`Failed to cleanup entertainment cache: ${error.message}`);
    }
  }
}

module.exports = new EntertainmentService();