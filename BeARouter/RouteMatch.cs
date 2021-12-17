using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter
{
    public class RouteMatch
    {

        public readonly bool Matches;
        
        public readonly Subnet CalculatedNetAddress;
        
        public readonly Route Route;

        public RouteMatch(Route route, bool matches, Subnet calculatedNetAddress)
        {
            Route = route;
            Matches = matches;
            this.CalculatedNetAddress = calculatedNetAddress;
        }
    }
}
