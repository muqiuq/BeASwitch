using BeAToolsLibrary.Certificates;
using DnsClient;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace SuccessCertificateSubmissionClient.Services
{
    public class SuccessCertificateSubmissionService
    {
        public static string GetSubmissionUrl()
        {
            var lookup = new LookupClient();
            var queryResult = lookup.Query("bearouterservice.alptbz.xyz", QueryType.TXT);
            if (queryResult.HasError || queryResult.Answers.Count != 1) throw new GeneralSubmissionException("DNS Lookup error");
            string submissionUrl = null;
            try
            {
                submissionUrl = queryResult.Answers.TxtRecords().First().Text.First();
            }catch(Exception ex)
            {
                throw new GeneralSubmissionException("TXT record extraction exception", ex);
            }
            if(submissionUrl == null)
            {
                throw new GeneralSubmissionException($"submissionUrl is null");
            }
            if(!submissionUrl.StartsWith("http://") && !submissionUrl.StartsWith("https://"))
            {
                throw new GeneralSubmissionException($"received invalid submission url ({submissionUrl})");
            }
            return submissionUrl;
        }

        public static async Task<string> SubmitCertificate(string email, string successCertificate) 
        {
            dynamic requestBodyContent = new
            {
                email = email,
                certificate = successCertificate
            };
            using HttpClient client = new();
            var requestMessage = new HttpRequestMessage(HttpMethod.Post, GetSubmissionUrl());
            requestMessage.Content = new StringContent(JsonConvert.SerializeObject(requestBodyContent), Encoding.UTF8, "application/json");
            var result = client.Send(requestMessage);
            if(!result.IsSuccessStatusCode)
            {
                throw new GeneralSubmissionException($"Submission failed with status code {result.StatusCode}");
            }
            string rawResultContent = await result.Content.ReadAsStringAsync();
            var resultContent = JsonConvert.DeserializeObject<dynamic>(rawResultContent);
            if(resultContent.success == false)
            {
                throw new GeneralSubmissionException($"Submission failed with message: \"{resultContent.message}\"");
            }
            return resultContent.message;
        }
    }
}
