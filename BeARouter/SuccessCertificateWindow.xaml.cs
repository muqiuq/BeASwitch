using BeAToolsLibrary;
using BeAToolsLibrary.Certificates;
using System;
using System.Collections.Generic;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;

namespace BeARouter
{
    /// <summary>
    /// Interaction logic for SuccessCertificateWindow.xaml
    /// </summary>
    public partial class SuccessCertificateWindow : Window
    {
        public SuccessCertificateWindow(Goal goal, string type)
        {
            InitializeComponent();

            textBlockMessage.Text = $"Congratulations!\nYou have reached your goal of '{goal}'.\nBelow you can find your SuccessCertificate, which you can send to your instructor.";

            var successCertificate = new SuccessCertificate(goal, type);

            textBoxCert.Text = successCertificate.Export(SuccessCertificatesDefaults.DefaultPublicKey, SuccessCertificatesDefaults.DefaultSecret);
        }
    }
}
