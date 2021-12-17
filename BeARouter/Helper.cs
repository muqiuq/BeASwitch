using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
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

        public static string GenerateRandomMAC()
        {
            byte[] mac = new byte[6];
            Random r = new Random();
            r.NextBytes(mac);
            mac[0] = (byte)0x02;
            return string.Join(":", Array.ConvertAll(mac, b => b.ToString("X2")));
        }

        [StructLayout(LayoutKind.Sequential)]
        struct DEVMODE
        {
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 0x20)]
            public string dmDeviceName;
            public short dmSpecVersion;
            public short dmDriverVersion;
            public short dmSize;
            public short dmDriverExtra;
            public int dmFields;
            public int dmPositionX;
            public int dmPositionY;
            public int dmDisplayOrientation;
            public int dmDisplayFixedOutput;
            public short dmColor;
            public short dmDuplex;
            public short dmYResolution;
            public short dmTTOption;
            public short dmCollate;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 0x20)]
            public string dmFormName;
            public short dmLogPixels;
            public int dmBitsPerPel;
            public int dmPelsWidth;
            public int dmPelsHeight;
            public int dmDisplayFlags;
            public int dmDisplayFrequency;
            public int dmICMMethod;
            public int dmICMIntent;
            public int dmMediaType;
            public int dmDitherType;
            public int dmReserved1;
            public int dmReserved2;
            public int dmPanningWidth;
            public int dmPanningHeight;
        }

        [DllImport("user32.dll")]
        static extern bool EnumDisplaySettings(string deviceName, int modeNum, ref DEVMODE devMode);

        public static Tuple<int, int> GetScreenResolution()
        {
            const int ENUM_CURRENT_SETTINGS = -1;

            DEVMODE devMode = default;
            devMode.dmSize = (short)Marshal.SizeOf(devMode);
            EnumDisplaySettings(null, ENUM_CURRENT_SETTINGS, ref devMode);

            return new Tuple<int, int>(devMode.dmPelsWidth, devMode.dmPelsHeight);
        }


    }
}
