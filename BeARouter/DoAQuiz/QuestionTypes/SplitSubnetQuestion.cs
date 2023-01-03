using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter.DoAQuiz.QuestionTypes
{
    [Frequency(2)]
    internal class SplitSubnetQuestion : IQuestion
    {
        Subnet subnet;
        private int newmask;
        private Subnet newsubnet;
        private string newsubnetstr;
        private int splits;

        public SplitSubnetQuestion()
        {
            subnet = Helper.GetRandomIPv4Subnet(maxCidr: 26).GetNetSubnet();
            Random r = new Random();
            splits = r.Next(2, 9);
            var add = Math.Log2(splits);
            var rounded = (int)add;
            if (add > rounded) rounded += 1;
            newmask = subnet.Mask + rounded;

            uint secondSubnet = (uint)(0x01 << 32 - newmask);

            newsubnet = new Subnet(subnet.IpAddress, newmask).GetNetSubnet().ApplyOr(secondSubnet);
            newsubnetstr = newsubnet.ToString();

        }

        public string Name => "Split Subnet";

        public string Question => $"Divide {subnet} by {splits}. Second resulting subnet?";

        public string Response => newsubnetstr;

        public string ResponseHint => "X.X.X.X/X";

        public QuestionCategory QuestionCategory => QuestionCategory.IPv4;

        public bool Evaluate(string response)
        {
            return response == Response;
        }
    }
}
