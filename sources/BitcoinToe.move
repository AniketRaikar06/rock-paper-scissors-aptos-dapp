module my_addrx::BitcoinToe5 {
    use std::signer;
    use std::vector;
    use std::string::{Self, String};
    use aptos_framework::event;
    use aptos_framework::timestamp;

    // Error codes
    const ERR_GAME_NOT_FOUND: u64 = 1;
    const ERR_GAME_ALREADY_ENDED: u64 = 2;
    const ERR_NOT_PLAYER: u64 = 3;
    const ERR_ALREADY_INITIALIZED: u64 = 4;
    const ERR_INVALID_CHARACTER: u64 = 5;
    const ERR_GAME_ALREADY_EXISTS: u64 = 6;

    // Character constants
    const DONALD: u8 = 1;
    const KAMALA: u8 = 2;
    const COMPUTER: u8 = 3;

    const GLOBAL_GAMES_ADDRESS: address = @sys_addrx;

    // Event for game updates
    #[event]
    struct GameEvent has drop, store {
        game_id: u64,
        event_type: String,    // "created", "ended"
        player: address,
        player_character: u8,
        computer_character: u8,
        timestamp: u64
    }

    // Represents a game with character selection
    struct Game has key, store, copy, drop {
        id: u64,
        player: address,
        player_character: u8,      // 1 for Donald, 2 for Kamala
        computer_character: u8,    // Automatically selected opposite character
        winner: address,           // Player's address or zero address for computer
        is_ended: bool,
        created_at: u64
    }

    // Global collection of games
    struct GameRegistry has key {
        games: vector<Game>,
        last_game_id: u64
    }

    // Initialize the game registry
    public entry fun initialize_registry(account: &signer) {
        let global_address = GLOBAL_GAMES_ADDRESS;
        assert!(!exists<GameRegistry>(global_address), ERR_ALREADY_INITIALIZED);

        let registry = GameRegistry {
            games: vector::empty<Game>(),
            last_game_id: 1000
        };

        move_to(account, registry);
    }

    // Create a new game with character selection
    public entry fun create_game(
        creator: &signer, 
        selected_character: u8
    ) acquires GameRegistry {
        // Validate character selection
        assert!(selected_character == DONALD || selected_character == KAMALA, ERR_INVALID_CHARACTER);

        let creator_addr = signer::address_of(creator);
        let registry = borrow_global_mut<GameRegistry>(GLOBAL_GAMES_ADDRESS);
        
        // Check for existing active game
        let i = 0;
        let len = vector::length(&registry.games);
        while (i < len) {
            let game = vector::borrow(&registry.games, i);
            if (!game.is_ended && game.player == creator_addr) {
                abort ERR_GAME_ALREADY_EXISTS; // Use a new error code for this scenario
            };
            i = i + 1;
        };

        let game_id = registry.last_game_id + 1;
        
        // Computer gets the opposite character
        let computer_char = if (selected_character == DONALD) { KAMALA } else { DONALD };
        
        let new_game = Game {
            id: game_id,
            player: creator_addr,
            player_character: selected_character,
            computer_character: computer_char,
            winner: @0x0,
            is_ended: false,
            created_at: timestamp::now_seconds()
        };

        vector::push_back(&mut registry.games, new_game);
        registry.last_game_id = game_id;

        event::emit(GameEvent {
            game_id,
            event_type: string::utf8(b"created"),
            player: creator_addr,
            player_character: selected_character,
            computer_character: computer_char,
            timestamp: timestamp::now_seconds()
        });
    }

    // Set winner for a game
    public entry fun set_winner(
        caller: &signer,
        game_id: u64,
        player_wins: bool  // true if player wins, false if computer wins
    ) acquires GameRegistry {
        let caller_addr = signer::address_of(caller);
        let registry = borrow_global_mut<GameRegistry>(GLOBAL_GAMES_ADDRESS);
        
        let i = 0;
        let len = vector::length(&registry.games);
        
        while (i < len) {
            let game = vector::borrow_mut(&mut registry.games, i);
            if (game.id == game_id) {
                // Only the player can set the winner
                assert!(game.player == caller_addr, ERR_NOT_PLAYER);
                assert!(!game.is_ended, ERR_GAME_ALREADY_ENDED);
                
                // Set winner address (player address if player wins, zero address if computer wins)
                game.winner = if (player_wins) { caller_addr } else { @0x0 };
                game.is_ended = true;
                
                event::emit(GameEvent {
                    game_id,
                    event_type: string::utf8(b"ended"),
                    player: game.player,
                    player_character: game.player_character,
                    computer_character: game.computer_character,
                    timestamp: timestamp::now_seconds()
                });
                return
            };
            i = i + 1;
        };
        abort ERR_GAME_NOT_FOUND
    }

    // View Functions

    #[view]
    // Get specific game by ID
    public fun get_game_by_id(game_id: u64): Game acquires GameRegistry {
        let registry = borrow_global<GameRegistry>(GLOBAL_GAMES_ADDRESS);
        let i = 0;
        let len = vector::length(&registry.games);
        
        while (i < len) {
            let game = vector::borrow(&registry.games, i);
            if (game.id == game_id) {
                return *game
            };
            i = i + 1;
        };
        abort ERR_GAME_NOT_FOUND
    }

    #[view]
    // Get player's character for a specific game
    public fun get_player_character(game_id: u64): u8 acquires GameRegistry {
        let game = get_game_by_id(game_id);
        game.player_character
    }

    #[view]
    // Get computer's character for a specific game
    public fun get_computer_character(game_id: u64): u8 acquires GameRegistry {
        let game = get_game_by_id(game_id);
        game.computer_character
    }

    #[view]
    // Get all active games for a player
    public fun get_player_active_games(player_addr: address): vector<Game> acquires GameRegistry {
        let registry = borrow_global<GameRegistry>(GLOBAL_GAMES_ADDRESS);
        let active_games = vector::empty<Game>();
        
        let i = 0;
        let len = vector::length(&registry.games);
        
        while (i < len) {
            let game = vector::borrow(&registry.games, i);
            if (!game.is_ended && game.player == player_addr) {
                vector::push_back(&mut active_games, *game);
            };
            i = i + 1;
        };
        active_games
    }

    #[view]
    // Get all ended games for a player
    public fun get_player_ended_games(player_addr: address): vector<Game> acquires GameRegistry {
        let registry = borrow_global<GameRegistry>(GLOBAL_GAMES_ADDRESS);
        let ended_games = vector::empty<Game>();
        
        let i = 0;
        let len = vector::length(&registry.games);
        
        while (i < len) {
            let game = vector::borrow(&registry.games, i);
            if (game.is_ended && game.player == player_addr) {
                vector::push_back(&mut ended_games, *game);
            };
            i = i + 1;
        };
        ended_games
    }

    #[view]
    // Get player's win count
    public fun get_player_wins(player_addr: address): u64 acquires GameRegistry {
        let registry = borrow_global<GameRegistry>(GLOBAL_GAMES_ADDRESS);
        let win_count = 0u64;
        
        let i = 0;
        let len = vector::length(&registry.games);
        
        while (i < len) {
            let game = vector::borrow(&registry.games, i);
            if (game.is_ended && game.winner == player_addr) {
                win_count = win_count + 1;
            };
            i = i + 1;
        };
        win_count
    }

    #[view]
    // Get player's computer opponent wins
    public fun get_computer_wins(player_addr: address): u64 acquires GameRegistry {
        let registry = borrow_global<GameRegistry>(GLOBAL_GAMES_ADDRESS);
        let comp_wins = 0u64;
        
        let i = 0;
        let len = vector::length(&registry.games);
        
        while (i < len) {
            let game = vector::borrow(&registry.games, i);
            if (game.is_ended && game.player == player_addr && game.winner == @0x0) {
                comp_wins = comp_wins + 1;
            };
            i = i + 1;
        };
        comp_wins
    }

    #[view]
    // Check if game has ended
    public fun is_game_ended(game_id: u64): bool acquires GameRegistry {
        let game = get_game_by_id(game_id);
        game.is_ended
    }

    #[view]
    // Get the winner (returns player address or zero address for computer)
    public fun get_winner(game_id: u64): address acquires GameRegistry {
        let game = get_game_by_id(game_id);
        assert!(game.is_ended, ERR_GAME_NOT_FOUND);
        game.winner
    }
}