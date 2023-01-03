using System;
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;

namespace BeAToolsLibrary
{
    public static class Helper
    {
        public static string Base64ToModAlp(string input)
        {
            return $"BEGIN:{input.Replace("/", ".").Replace("+", "-")}:END";
        }

        public static bool IsModAlp(string input)
        {
            var parts = input.Split(":");
            return input.StartsWith("BEGIN") && input.EndsWith(":END") && parts.Length == 3;
        }

        public static string ModAlpToBase64(string input)
        {
            var parts = input.Split(":");
            if (!input.StartsWith("BEGIN") || !input.EndsWith(":END") || parts.Length != 3)
            {
                throw new ArgumentException("Invalid key format");
            }
            return parts[1].Replace(".", "/").Replace("-", "+");
        }

        public static byte[] ModAlpBase64ToBytes(string input)
        {
            string base64 = ModAlpToBase64(input);
            return Convert.FromBase64String(base64);
        }

        public static string SpliceText(string text, int lineLength)
        {
            return Regex.Replace(text, "(.{" + lineLength + "})", "$1" + "\n");
        }

    }
}
