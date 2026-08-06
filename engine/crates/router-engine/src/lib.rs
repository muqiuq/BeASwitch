//! BeARouter: IPv4 routing simulation and round orchestration.

pub mod game;
pub mod routing;

pub use game::{Game, GameConfig, GameState, Ipv4Packet, RoundResult};
pub use routing::{MatchOutcome, Route, RouteMatch, RouterPort, RoutingTable};
