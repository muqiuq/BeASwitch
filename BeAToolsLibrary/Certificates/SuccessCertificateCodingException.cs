using System;
using System.Collections.Generic;
using System.Runtime.Serialization;
using System.Text;

namespace BeAToolsLibrary.Certificates
{
    public class SuccessCertificateCodingException : Exception
    {
        public SuccessCertificateCodingException()
        {
        }

        public SuccessCertificateCodingException(string message) : base(message)
        {
        }

        public SuccessCertificateCodingException(string message, Exception innerException) : base(message, innerException)
        {
        }

        protected SuccessCertificateCodingException(SerializationInfo info, StreamingContext context) : base(info, context)
        {
        }
    }
}
