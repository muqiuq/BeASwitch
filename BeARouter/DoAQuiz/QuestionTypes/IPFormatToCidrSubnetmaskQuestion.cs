using System;
using System.Collections.Generic;
using System.Net;
using System.Text;

namespace BeARouter.DoAQuiz.QuestionTypes
{
    internal class IPFormatToCidrSubnetmaskQuestion : IQuestion
    {
        string CidrStr;
        string netMaskStr;
        public IPFormatToCidrSubnetmaskQuestion()
        {
            Random r = new Random();

            int randomMask = r.Next(0, 33);
            byte[] bytes = Subnet.MaskToBytes(randomMask);
            var netmask = new IPv4Address(new IPAddress(bytes));
            netMaskStr = netmask.ToString();
            CidrStr = randomMask.ToString();
        }

        public string Name => "IPv4 format to CIDR";

        public string Question => $"CIDR of {netMaskStr}?";

        public string Response => CidrStr;

        public string ResponseHint => "X";

        public QuestionCategory QuestionCategory => QuestionCategory.IPv4;

        public bool Evaluate(string response)
        {
            return response == CidrStr;
        }
    }
}
