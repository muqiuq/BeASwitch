using System;
using System.Collections.Generic;
using System.Net;
using System.Text;

namespace BeARouter.DoAQuiz.QuestionTypes
{
    internal class CidrToIPFormatSubnetmaskQuestion : IQuestion
    {

        string CidrStr;
        string netMaskStr;
        public CidrToIPFormatSubnetmaskQuestion()
        {
            Random r = new Random();

            int randomMask = r.Next(0, 33);
            byte[] bytes = Subnet.MaskToBytes(randomMask);
            var netmask = new IPv4Address(new IPAddress(bytes));
            netMaskStr = netmask.ToString();
            CidrStr = randomMask.ToString();
        }

        public string Name => "CIDR To IPv4 format";

        public string Question => $"IPv4 format of CIDR /{CidrStr}?";

        public string Response => netMaskStr;

        public string ResponseHint => "X.X.X.X";

        public bool Evaluate(string response)
        {
            return response == netMaskStr;
        }
    }
}
