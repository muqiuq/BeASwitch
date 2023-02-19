using BeAToolsLibrary;
using BeAToolsLibrary.Certificates;
using Microsoft.Win32;
using SuccessCertificateSubmissionClient;
using SuccessCertificateSubmissionClient.Services;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;

namespace BeAUILibrary
{
    /// <summary>
    /// Interaction logic for SuccessCertificateWindow.xaml
    /// </summary>
    public partial class SuccessCertificateWindow : Window
    {
        private SuccessCertificate successCertificate;

        Thread submissionThread;
        private string certificateFileSavePath;
        private string certificateSavePath;

        private bool savedCertificate = false;

        public SuccessCertificateWindow(Goal goal, string type)
        {
            InitializeComponent();

            textBlockMessage.Text = $"Congratulations!\nYou have reached your goal of '{goal}'.\nIf required, you can send the SuccessCertificate (see below) to your instructor.";

            successCertificate = new SuccessCertificate(goal, type);


            var cleanedType = new string(type.Where(c => (char.IsLetterOrDigit(c))).ToArray());

            labelPath.Foreground = Brushes.Blue;

            textBoxCert.Text = successCertificate.Export(SuccessCertificatesDefaults.DefaultPublicKey, SuccessCertificatesDefaults.DefaultSecret);

            try
            {
                certificateSavePath = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "BeARouterCertificates");
                if (System.IO.Directory.Exists(certificateSavePath) == false)
                {
                    System.IO.Directory.CreateDirectory(certificateSavePath);
                }
                certificateFileSavePath = System.IO.Path.Combine(certificateSavePath, $"{cleanedType}-{DateTime.Now.ToString("yyyyMMdd-mmhhss")}.txt");
                System.IO.File.WriteAllText(certificateFileSavePath, textBoxCert.Text);
                labelPath.Content = $"Saved in {certificateFileSavePath}";
                savedCertificate = true;
            }
            catch(Exception ex)
            {
                MessageBox.Show("Error saving certificate. Copy your certificate and save it manually.\n" + ex.Message, "Error saving certificate", MessageBoxButton.OK, MessageBoxImage.Error);
                labelPath.Content = $"Click here to save the certificate manually.";
            }
            
            progressBar.Visibility = Visibility.Hidden;
        }

        public void ShowSubmissionResult(bool success, string message)
        {
            
            if (!CheckAccess())
            {
                Dispatcher.Invoke(() => ShowSubmissionResult(success, message));
                return;
            }
            progressBar.Visibility = Visibility.Hidden;
            MessageBox.Show(message, success ? "Success" : "Failure", MessageBoxButton.OK, success ? MessageBoxImage.Information : MessageBoxImage.Error);
            buttonSubmit.IsEnabled = true;
        }

        private void buttonSubmit_Click(object sender, RoutedEventArgs e)
        {
            var email = textBoxEMail.Text;
            var certificate = textBoxCert.Text;
            if(submissionThread != null && submissionThread.IsAlive )
            {
                return;
            }
            submissionThread = new Thread(() =>
            {
                var submitCertificateTask = SuccessCertificateSubmissionService.SubmitCertificate(email, certificate);
                try
                {
                    submitCertificateTask.Wait();
                }
                catch (Exception ex)
                {
                    ShowSubmissionResult(false, $"Failed to submit certificate.\nError Message: {ex.Message}");
                    return;
                }
                ShowSubmissionResult(true, submitCertificateTask.Result);
            });
            progressBar.Visibility = Visibility.Visible;
            buttonSubmit.IsEnabled = false;
            submissionThread.Start();
        }

        private void textBoxEMail_TextChanged(object sender, TextChangedEventArgs e)
        {
            buttonSubmit.IsEnabled = (textBoxEMail.Text.Contains("@") 
                && textBoxEMail.Text.Contains(".") 
                && textBoxEMail.Text.Length >= 6
                && !textBoxEMail.Text.EndsWith(".")
                && !textBoxEMail.Text.EndsWith("@")
                && (submissionThread == null || !submissionThread.IsAlive));
        }

        private void labelPath_MouseLeftButtonUp(object sender, MouseButtonEventArgs e)
        {
            if(certificateFileSavePath != null && certificateSavePath != null && savedCertificate)
            {
                try
                {
                    Process.Start("explorer.exe", certificateSavePath);
                }catch(Exception ex)
                {
                    MessageBox.Show(certificateFileSavePath);
                }
            }
            else
            {
                var dialog = new SaveFileDialog();
                dialog.Filter = "Text files (*.txt)|*.txt";
                var dialogResult = dialog.ShowDialog(this);
                if (dialogResult.HasValue && dialogResult.Value)
                {
                    try
                    {
                        System.IO.File.WriteAllText(dialog.FileName, textBoxCert.Text);
                        certificateFileSavePath = dialog.FileName;
                        certificateSavePath = System.IO.Path.GetDirectoryName(dialog.FileName);
                        labelPath.Content = $"Saved in {certificateFileSavePath}";
                        savedCertificate = true;
                    }
                    catch (Exception ex)
                    {
                        MessageBox.Show("Error saving certificate." + ex.Message, "Error saving certificate", MessageBoxButton.OK, MessageBoxImage.Error);
                        return;
                    }
                }

            }
            
        }
    }
}
