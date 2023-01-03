using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.NetworkInformation;
using System.Runtime.Intrinsics.X86;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using BeAToolsLibrary;

namespace BeAToolsLibrary.Certificates
{
    public class SuccessCertificate
    {
        public string ComputerName { get; private set; }

        public string UserName { get; private set; }

        public string NetworkInterfacesHash { get; private set; }

        public Goal Goal { get; private set; }

        public string Timestamp { get; private set; }

        public string Type { get; private set; }

        public SuccessCertificate(Goal goal, string type)
        {
            ComputerName = System.Environment.MachineName.Replace(";", "");
            UserName = System.Environment.UserName.Replace(";", "");
            NetworkInterfacesHash = GenerateNetworkInterfacesHash();
            Goal = goal;
            Type = type;
            Timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        }

        private SuccessCertificate(string computerName, string userName, string networkInterfacesHash, string goal, string timestamp, string type)
        {
            UserName = userName;
            NetworkInterfacesHash = networkInterfacesHash;
            Goal = Goal.Parse(goal);
            Timestamp = timestamp;
            ComputerName = computerName;
            Type = type;
        }

        public String GenerateNetworkInterfacesHash()
        {
            var macAddrs =
            (
                from nic in NetworkInterface.GetAllNetworkInterfaces()
                where nic.OperationalStatus == OperationalStatus.Up
                && (nic.NetworkInterfaceType == NetworkInterfaceType.Ethernet || nic.NetworkInterfaceType == NetworkInterfaceType.Wireless80211)
                && nic.GetPhysicalAddress() != null
                && nic.GetPhysicalAddress().GetAddressBytes().Length > 0
                select nic.GetPhysicalAddress()
            );

            string macCombined = "";

            foreach(var macAddr in macAddrs)
            {
                if (macAddr.ToString().StartsWith("00155D")) continue;
                macCombined+= macAddr.ToString();
            }

            if(macCombined.Length > 0 )
            {
                macCombined = "N/A";
            }

            var md5 = MD5.Create();

            return BitConverter.ToString(md5.ComputeHash(Encoding.UTF8.GetBytes(macCombined)));
        }

        public string Export(string publicKey, string secret)
        {
            RSA rsa = RSA.Create(SuccessCertificatesDefaults.DefaultKeySize);
            try
            {
                rsa.ImportRSAPublicKey(new System.ReadOnlySpan<byte>(Helper.ModAlpBase64ToBytes(publicKey)), out int bytesRead);
            }catch(Exception e)
            {
                throw new SuccessCertificateCodingException("Could not load public key", e);
            }
            
            var aes = System.Security.Cryptography.Aes.Create();
            
            var encryptedSymmetricKey = Convert.ToBase64String(rsa.Encrypt(aes.Key, RSAEncryptionPadding.Pkcs1));
            var encryptedSymmetricIV = Convert.ToBase64String(rsa.Encrypt(aes.IV, RSAEncryptionPadding.Pkcs1));

            var combinedinformations = $"{ComputerName};{UserName};{NetworkInterfacesHash};{Goal};{Timestamp};{Type}";

            MemoryStream ms = new MemoryStream();

            byte[] encryptedBytes;

            using (CryptoStream cs = new CryptoStream(ms, aes.CreateEncryptor(aes.Key, aes.IV), CryptoStreamMode.Write))
            {
                // Create StreamWriter and write data to a stream    
                using (StreamWriter sw = new StreamWriter(cs, Encoding.UTF8))
                    sw.Write(combinedinformations);
                encryptedBytes = ms.ToArray();
            }

            var signature = calculateSignature(secret, encryptedBytes);
            var content = Convert.ToBase64String(encryptedBytes);

            var combinedOutput = SuccessCertificatesDefaults.CERTIFICATE_FIRST_LINE + "\n" + 
                Helper.SpliceText(content + "-" + signature + "-" + encryptedSymmetricKey + "-" +encryptedSymmetricIV, SuccessCertificatesDefaults.CERTIFICATE_FIRST_LINE.Length)
                + "\n" + SuccessCertificatesDefaults.CERTIFICATE_LAST_LINE;

            return combinedOutput;
        }

        private static string calculateSignature(String secret, byte[] encryptedContent)
        {
            var sha1 = SHA1.Create();

            var secretBytes = Encoding.UTF8.GetBytes(secret);
            byte[] encryptedBytesWithSecret = new byte[encryptedContent.Length + secretBytes.Length];
            System.Buffer.BlockCopy(encryptedContent, 0, encryptedBytesWithSecret, 0, encryptedContent.Length);
            System.Buffer.BlockCopy(secretBytes, 0, encryptedBytesWithSecret, encryptedContent.Length, secretBytes.Length);

            return Convert.ToBase64String(sha1.ComputeHash(encryptedBytesWithSecret));
        }

        public static SuccessCertificate Decrypt(string input, string privateKey, string secret)
        {
            RSA rsa = RSA.Create(SuccessCertificatesDefaults.DefaultKeySize);

            rsa.ImportRSAPrivateKey(new System.ReadOnlySpan<byte>(Helper.ModAlpBase64ToBytes(privateKey)), out int bytesRead);

            var lines = input.Replace("\r", "").Split("\n");

            if(!input.StartsWith(SuccessCertificatesDefaults.CERTIFICATE_FIRST_LINE) || !input.EndsWith(SuccessCertificatesDefaults.CERTIFICATE_LAST_LINE) || lines.Length < 3)
            {
                throw new SuccessCertificateCodingException("Missing header, footer or invalid line count");
            }

            var contentParts = String.Join("", lines, 1, lines.Length - 2).Split("-");

            if(contentParts.Length != 4) {
                throw new SuccessCertificateCodingException("Invalid content (4)");
            }

            var aes = System.Security.Cryptography.Aes.Create();

            var symmetricKey = rsa.Decrypt(Convert.FromBase64String(contentParts[2]), RSAEncryptionPadding.Pkcs1);
            var symmetricIV = rsa.Decrypt(Convert.FromBase64String(contentParts[3]), RSAEncryptionPadding.Pkcs1);

            MemoryStream ms = new MemoryStream();

            var informations = "";
            var encryptedContent = Convert.FromBase64String(contentParts[0]);

            using (CryptoStream cs = new CryptoStream(ms, aes.CreateDecryptor(symmetricKey, symmetricIV), CryptoStreamMode.Write))
            {
                cs.Write(encryptedContent);
                cs.FlushFinalBlock();
                informations = Encoding.UTF8.GetString(ms.ToArray());
            }

            var signature = calculateSignature(secret, encryptedContent);

            if(signature != contentParts[1])
            {
                throw new SuccessCertificateCodingException("signature verification failed");
            }

            var informationsParts = informations.Split(";");
            
            if(informationsParts.Length != 6) { throw new SuccessCertificateCodingException("invalid information format"); }

            return new SuccessCertificate(informationsParts[0], informationsParts[1], informationsParts[2], informationsParts[3], informationsParts[4], informationsParts[5]);
        }
    }
}
