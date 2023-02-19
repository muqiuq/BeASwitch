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
using System.Windows.Shapes;

namespace BeASwitch
{
    /// <summary>
    /// Interaction logic for MacAddressInputWindow.xaml
    /// </summary>
    public partial class MacAddressInputWindow : Window
    {
        private readonly List<EthernetHost> ethernetHosts;
        private readonly EthernetFrame ethernetFrame;
        private readonly bool entryRequired;
        private bool checkedInput = false;

        public bool AnsweredCorrectly { get; private set; }

        public MacAddressInputWindow(List<EthernetHost> ethernetHosts, List<SwitchPort> switchPorts, EthernetFrame ethernetFrame, bool entryRequired)
        {
            InitializeComponent();
            this.ethernetHosts = ethernetHosts;
            this.ethernetFrame = ethernetFrame;
            this.entryRequired = entryRequired;
            ethernetHosts.ForEach(eh => comboBoxMac.Items.Add(eh.MAC));
            switchPorts.ForEach(sp => comboBoxPort.Items.Add(sp.Num));
            enableMacEntrySection(false);
            buttonOK.IsEnabled = false;
            labelMacCorrect.Visibility = Visibility.Hidden;
            labelPortCorrect.Visibility = Visibility.Hidden;
            labelNeedsEntryCorrect.Visibility = Visibility.Hidden;
        }
        private void Window_Loaded(object sender, RoutedEventArgs e)
        {
            radioButtonEntryRequired.Focus();
        }

        private void radioButtonChanged(object sender, RoutedEventArgs e)
        {
            var macAdrressEntryRequired = radioButtonEntryRequired.IsChecked.HasValue && radioButtonEntryRequired.IsChecked.Value;
            enableMacEntrySection(macAdrressEntryRequired);
            buttonOK.IsEnabled = true;
        }

        private void enableMacEntrySection(bool macAdrressEntryRequired)
        {
            comboBoxMac.IsEnabled = macAdrressEntryRequired;
            comboBoxPort.IsEnabled = macAdrressEntryRequired;
            labelNewEntry.Opacity = macAdrressEntryRequired ? 1 : 0.5;
            labelMac.Opacity = macAdrressEntryRequired ? 1 : 0.5;
            labelPort.Opacity = macAdrressEntryRequired ? 1 : 0.5;
            buttonOK.Content = macAdrressEntryRequired ? "Add new entry" : "Skip";
        }

        private void buttonOK_Click(object sender, RoutedEventArgs e)
        {
            if(checkedInput)
            {
                Close();
                return;
            }
            AnsweredCorrectly = true;
            labelNeedsEntryCorrect.Visibility = Visibility.Visible;
            if (radioButtonEntryRequired.IsChecked.Value == entryRequired)
            {
                labelNeedsEntryCorrect.Foreground = Brushes.DarkGreen;
                labelNeedsEntryCorrect.Content = "Correct";
            }
            else
            {
                labelNeedsEntryCorrect.Foreground = Brushes.Red;
                labelNeedsEntryCorrect.Content = "Incorrect";
                AnsweredCorrectly = false;
            }

            if (entryRequired)
            {
                if(comboBoxMac.SelectedItem != null && comboBoxPort.SelectedItem != null)
                {
                    var userInputMac = comboBoxMac.SelectedItem.ToString().ToUpper();
                    var userInputPort = comboBoxPort.SelectedItem.ToString().ToUpper();
                    
                    if (userInputMac == ethernetFrame.SourceHost.MAC) {
                        labelMacCorrect.Foreground = Brushes.DarkGreen;
                        labelMacCorrect.Content = "Correct";
                    }
                    else
                    {
                        labelMacCorrect.Foreground = Brushes.Red;
                        labelMacCorrect.Content = $"Incorrect => Correct: {ethernetFrame.SourceHost.MAC}";
                        AnsweredCorrectly = false;
                    }
                    if(userInputPort == ethernetFrame.AttachedCurrentlyToSwitchPort.Num.ToString())
                    {
                        labelPortCorrect.Foreground = Brushes.DarkGreen;
                        labelPortCorrect.Content = "Correct";
                    }
                    else
                    {
                        labelPortCorrect.Foreground = Brushes.Red;
                        labelPortCorrect.Content = $"Incorrect => Correct: {ethernetFrame.AttachedCurrentlyToSwitchPort.Num}";
                        AnsweredCorrectly = false;
                    }
                    labelPortCorrect.Visibility = Visibility.Visible;
                    labelMacCorrect.Visibility = Visibility.Visible;
                }
            }
            buttonOK.Content = "Continue";
            checkedInput = true;
        }
    }
}
