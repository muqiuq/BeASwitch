using BeAToolsLibrary;
using BeAToolsLibrary.Certificates;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;

namespace SuccessCertificateVerficiationTool
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();

            textBoxSecret.Text = BeAToolsLibrary.Certificates.SuccessCertificatesDefaults.DefaultSecret;
        }

        private void buttonGenNewKey_Click(object sender, RoutedEventArgs e)
        {
            // https://crypto.stackexchange.com/questions/31807/why-does-my-ssh-private-key-still-work-after-changing-some-bytes-in-the-file
            RSA rsa = RSA.Create(512);

            var privateKey = BeAToolsLibrary.Helper.Base64ToModAlp(Convert.ToBase64String(rsa.ExportRSAPrivateKey()));
            var publicKey = BeAToolsLibrary.Helper.Base64ToModAlp(Convert.ToBase64String(rsa.ExportRSAPublicKey()));

            if(Convert.ToBase64String(rsa.ExportRSAPrivateKey()) != BeAToolsLibrary.Helper.ModAlpToBase64(BeAToolsLibrary.Helper.Base64ToModAlp(Convert.ToBase64String(rsa.ExportRSAPrivateKey()))))
            {
                throw new SystemException("Impossible state");
            }

            textBoxPrivateKey.Text = privateKey;
            textBoxPublicKey.Text = publicKey;

        }

        private void buttonCreateCert_Click(object sender, RoutedEventArgs e)
        {
            var successCertificate = new SuccessCertificate(Goal.Parse("30/30"), "Test");

            textBoxCertComputerName.Text = successCertificate.ComputerName;
            textBoxCertNetworkInterfaceHash.Text = successCertificate.NetworkInterfacesHash;
            textBoxCertTimestamp.Text = successCertificate.Timestamp;
            textBoxCertUserName.Text = successCertificate.UserName;
            textBoxCertGoal.Text = successCertificate.Goal.ToString();
            textBoxCertType.Text = successCertificate.Type;
            checkBoxValidSecret.IsChecked = true;

            textBoxCert.Text = successCertificate.Export(textBoxPublicKey.Text, textBoxSecret.Text);
        }

        private void textBoxPrivateKey_TextChanged(object sender, TextChangedEventArgs e)
        {
            var privateKey = textBoxPrivateKey.Text;
            if (BeAToolsLibrary.Helper.IsModAlp(privateKey))
            {
                try
                {
                    RSA rsa = RSA.Create(SuccessCertificatesDefaults.DefaultKeySize);

                    rsa.ImportRSAPrivateKey(new System.ReadOnlySpan<byte>(Helper.ModAlpBase64ToBytes(privateKey)), out int bytesRead);

                    textBoxPublicKey.Text = BeAToolsLibrary.Helper.Base64ToModAlp(Convert.ToBase64String(rsa.ExportRSAPublicKey()));
                }
                catch(Exception ex)
                {
                    Debug.WriteLine(ex);
                }

            }
        }

        private void textBoxCert_TextChanged(object sender, TextChangedEventArgs e)
        {

        }

        private void buttonDecrypt_Click(object sender, RoutedEventArgs e)
        {
            var successCertificate = SuccessCertificate.Decrypt(textBoxCert.Text, textBoxPrivateKey.Text, textBoxSecret.Text);

            textBoxCertComputerName.Text = successCertificate.ComputerName;
            textBoxCertNetworkInterfaceHash.Text = successCertificate.NetworkInterfacesHash;
            textBoxCertTimestamp.Text = successCertificate.Timestamp;
            textBoxCertUserName.Text = successCertificate.UserName;
            textBoxCertGoal.Text = successCertificate.Goal.ToString();
            textBoxCertType.Text = successCertificate.Type;
            checkBoxValidSecret.IsChecked = true;
        }
    }
}
