using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter.DoAQuiz
{
    internal class NumberOfHostsQuestion : IQuestion
    {
        private Subnet subnet;
        private long numOfAddresses;

        public NumberOfHostsQuestion()
        {
            subnet = Helper.GetRandomIPv4Subnet(22);

            numOfAddresses = subnet.NumOfHostAddress;
        }
        
        
        public string Name => "Number of Hosts in";

        public string Question => $"Number of hosts in {subnet.ToString()}?";

        public string Response => numOfAddresses.ToString();

        public bool Evaluate(string response)
        {
            return response == Response;
        }
    }
}
