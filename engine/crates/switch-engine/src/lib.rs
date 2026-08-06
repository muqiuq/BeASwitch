//! BeASwitch: layer-2 forwarding simulation and round orchestration.

pub mod engine;
pub mod game;

pub use engine::{
    EthernetFrame, Host, MacTable, PortDecision, SwitchAction, SwitchActionType, SwitchEngine,
    SwitchPort, VlanId,
};
pub use game::{
    describe_action, Answer, Game, GameConfig, GameState, PortAnswer, PortVerdict, RoundResult,
};
