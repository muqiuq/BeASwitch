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

namespace BeASwitch
{
    /// <summary>
    /// Interaction logic for IntroWindow.xaml
    /// </summary>
    public partial class IntroWindow : Window
    {
        public IntroWindow()
        {
            InitializeComponent();
        }

        private void buttonStart_Click(object sender, RoutedEventArgs e)
        {
            InstanceSettings instanceSettings = new InstanceSettings()
            {
                UseVLAN = checkBoxUseVLAN.IsChecked.Value
            };

            var mainWindow = new MainWindow(instanceSettings);

            mainWindow.Show();

            this.Close();
        }
    }
}
