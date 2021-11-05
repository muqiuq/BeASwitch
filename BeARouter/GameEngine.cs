using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter
{
    public class GameEngine
    {
        public GameState State = GameState.NEW;



        public int numberOfCorrectAttemts = 0;
        public int numberOfAttemts = 0;

        public GameEngine()
        {

        }

    }
}
