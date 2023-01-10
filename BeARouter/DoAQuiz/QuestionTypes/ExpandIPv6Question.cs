using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter.DoAQuiz.QuestionTypes
{
    public class ExpandIPv6Question : IQuestion
    {
        private IPv6Address ipAddress;
        private string expandedIPv6;

        public ExpandIPv6Question()
        {
            ipAddress = Helper.GetRandomIPv6Subnet(numberOfZeroBytes: 7).GetAddress();
            expandedIPv6 = ipAddress.Expand();
        }

        public string Name => "Expand IPv6";

        public string Question => $"Expand the following IPv6 address: {ipAddress}";

        public string Response => expandedIPv6;

        public string ResponseTemplate => ipAddress.ToString();

        public string ResponseHint => "";

        public QuestionCategory QuestionCategory => QuestionCategory.IPv6;

        public QuestionInputType InputType => QuestionInputType.Text;

        public string[] AnswerOptions => throw new NotImplementedException();

        public bool Evaluate(string response)
        {
            return response == expandedIPv6;
        }
    }
}
