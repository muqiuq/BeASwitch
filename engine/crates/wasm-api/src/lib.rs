//! wasm-bindgen surface for the browser app.
//!
//! All simulation logic and every expected answer stay on this side of the
//! boundary; the UI only ever receives what it needs to render.

mod dto;
mod quiz;
mod router;
mod switch;

pub use quiz::QuizSession;
pub use router::RouterGame;
pub use switch::SwitchGame;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_owned()
}
