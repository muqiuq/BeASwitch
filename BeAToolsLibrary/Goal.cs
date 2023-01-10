using System;
using System.Collections.Generic;
using System.Text;

namespace BeAToolsLibrary
{
    public class Goal
    {

        public readonly int NumberOfTotalAttempts;

        public readonly int NumberOfCorrectAttempts;

        public Goal(int numberOfTotalAttempts, int numberOfCorrectAttempts)
        {
            NumberOfTotalAttempts = numberOfTotalAttempts;
            NumberOfCorrectAttempts = numberOfCorrectAttempts;
        }

        public static Goal Parse(string input)
        {
            var parts = input.Split("/");
            if(parts.Length != 2 ) { throw new ArgumentException("Invalid goal format (structure)"); }
            if (!Int32.TryParse(parts[0], out int numberOfCorrectAttempts) || !Int32.TryParse(parts[1], out int numberOfTotalAttempts))
            {
                throw new ArgumentException("invalid goal format (int parse)");
            }
            if(numberOfCorrectAttempts > numberOfTotalAttempts)
            {
                throw new ArgumentException("number of correct attempt cannot be bigger then the number of total attempts");
            }
            return new Goal(numberOfTotalAttempts, numberOfCorrectAttempts);
        }

        public override string ToString()
        {
            return $"{NumberOfCorrectAttempts}/{NumberOfTotalAttempts}";
        }

        public bool IsGoalReached(int numberOfCorrectAttempts, int numberOfTotalAttempts)
        {
            return numberOfCorrectAttempts >= NumberOfCorrectAttempts && numberOfTotalAttempts == NumberOfTotalAttempts;
        }

        public bool CanGoalBeReached(int numberOfCorrectAttempts, int numberOfTotalAttempts)
        {
            return (numberOfTotalAttempts - numberOfCorrectAttempts) <= (NumberOfTotalAttempts - NumberOfCorrectAttempts);
        }
    }
}
