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
    /// Interaction logic for SelectAppPage.xaml
    /// </summary>
    public partial class SelectAppPage : Page
    {
        private readonly WelcomeWindow.Next1Delegate next1Delegate;

        public SelectAppPage(WelcomeWindow.Next1Delegate next1Delegate)
        {
            InitializeComponent();
            this.next1Delegate = next1Delegate;
        }

        public AppTypes SelectedApp { get; private set; }

        private void buttonBeARouter_Click(object sender, RoutedEventArgs e)
        {
            SelectedApp = AppTypes.BeARouter;
            next1Delegate(SelectedApp, new InstanceSettings());
        }

        private void buttonIPQuiz_Click(object sender, RoutedEventArgs e)
        {
            SelectedApp = AppTypes.IPQuiz;
            next1Delegate(SelectedApp, new InstanceSettings());
        }
    }
}
