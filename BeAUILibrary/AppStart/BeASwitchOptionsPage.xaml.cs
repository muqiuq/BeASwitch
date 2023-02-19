using System;
using System.Collections.Generic;
using System.Linq;
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

namespace BeAUILibrary.AppStart
{
    /// <summary>
    /// Interaction logic for BeASwitchOptionsPage.xaml
    /// </summary>
    public partial class BeASwitchOptionsPage : Page
    {
        private readonly WelcomeWindow.Next1Delegate next1Delegate;

        public BeASwitchOptionsPage(WelcomeWindow.Next1Delegate next1Delegate)
        {
            InitializeComponent();
            this.next1Delegate = next1Delegate;
        }

        private void buttonNext_Click(object sender, RoutedEventArgs e)
        {
            next1Delegate(AppTypes.BeASwitch, new InstanceSettings() { UseVLAN = checkBoxVLAN.IsChecked.Value });
        }
    }
}
