using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter.DoAQuiz
{
    public class NetmaskQuestion : IQuestion
    {
        private Subnet ip;
        private IPv4Address net;

        public NetmaskQuestion()
        {
            ip = Helper.GetRandomIPv4Subnet();
            net = ip.GetNetSubnet().GetAddress();
        }

        public string Name => $"Netaddress of {ip.ToString()}";

        public string Question => $"Network address of {ip.ToString()}?";

        public string Response => net.ToString();

        public bool Evaluate(string response)
        {
            return response == net.ToString();
        }
    }
}
