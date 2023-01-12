using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter.DoAQuiz.QuestionTypes
{
    public class AbbreviatingIPv6Question : IQuestion
    {
        private IPv6Address ipAddress;
        private string expandedIPv6;
        private string alternativeIPv6;

        public AbbreviatingIPv6Question()
        {
            ipAddress = Helper.GetRandomIPv6Subnet(numberOfZeroBytes: 7).GetAddress();
            expandedIPv6 = ipAddress.Expand();
            alternativeIPv6 = ipAddress.GetAlternativeAbbreviation();
        }

        public string Name => "Abbreviating IPv6";

        public string Question => $"Abbreviate the following IPv6 address: {expandedIPv6}";

        public string Response => ipAddress.ToString();

        public string ResponseTemplate => expandedIPv6;

        public string ResponseHint => "";

        public QuestionCategory QuestionCategory => QuestionCategory.IPv6;

        public QuestionInputType InputType => QuestionInputType.Text;

        public string[] AnswerOptions => throw new NotImplementedException();

        public bool Evaluate(string response)
        {
            return response == ipAddress.ToString() || response == alternativeIPv6;
        }
    }
}
