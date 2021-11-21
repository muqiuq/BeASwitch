using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter
{
    public class Helper
    {

        public static bool Equals(byte[] a1, byte[] b1)
        {
            int i;
            if (a1.Length == b1.Length)
            {
                i = 0;
                while (i < a1.Length && (a1[i] == b1[i])) //Earlier it was a1[i]!=b1[i]
                {
                    i++;
                }
                if (i == a1.Length)
                {
                    return true;
                }
            }

            return false;
        }

        public static long ByteArrayToLong(byte[] by)
        {
            long value = 0;
            for (int i = 0; i < by.Length; i++)
            {
                value = (value << 8) + (by[i] & 0xff);
            }

            return value;
        }

    }
}
