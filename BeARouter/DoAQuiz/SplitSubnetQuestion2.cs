using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter.DoAQuiz
{
    [Frequency(2)]
    public class SplitSubnetQuestion2 : IQuestion
    {
        Subnet subnet;
        private int newmask;
        private Subnet newsubnet;
        private string newsubnetstr;
        private int splits;

        public SplitSubnetQuestion2()
        {
            subnet = Helper.GetRandomIPv4Subnet(maxCidr: 26).GetNetSubnet();
            Random r = new Random();
            splits = r.Next(3, 9);
            var add = Math.Log2(splits);
            var rounded = (int)add;
            if (add > rounded) rounded += 1;
            newmask = subnet.Mask + rounded;

            uint secondSubnet = (uint)(0x01 << (32 - (newmask-1)));

            newsubnet = new Subnet(subnet.IpAddress, newmask).GetNetSubnet().ApplyOr(secondSubnet);
            newsubnetstr = newsubnet.ToString();

        }

        public string Name => "Divide Subnet";

        public string Question => $"Divide {subnet} by {splits}. Third resulting subnet?";

        public string Response => newsubnetstr;

        public string ResponseHint => "X.X.X.X/X";

        public bool Evaluate(string response)
        {
            return response == Response;
        }
    }
}
