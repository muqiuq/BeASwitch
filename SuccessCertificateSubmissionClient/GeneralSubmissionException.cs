using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.Text;
using System.Threading.Tasks;

namespace SuccessCertificateSubmissionClient
{
    public class GeneralSubmissionException : Exception
    {
        public GeneralSubmissionException()
        {
        }

        public GeneralSubmissionException(string message) : base(message)
        {
        }

        public GeneralSubmissionException(string message, Exception innerException) : base(message, innerException)
        {
        }

        protected GeneralSubmissionException(SerializationInfo info, StreamingContext context) : base(info, context)
        {
        }
    }
}
