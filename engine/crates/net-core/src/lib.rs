//! Dependency-free networking primitives shared by all three exercises.

pub mod mac;
pub mod rng;
pub mod score;
pub mod v4;
pub mod v6;

pub use mac::MacAddress;
pub use rng::Rng;
pub use score::{Goal, GoalStatus, UserScore};
pub use v4::{SubnetV4, V4_BITS};
pub use v6::{SubnetV6, V6_BITS};
