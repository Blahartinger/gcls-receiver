from django.shortcuts import render
from django.http import HttpResponse
import requests, requests.utils


# Create your views here.
def corsproxy(request, requestedurl):

    print(requestedurl)
    proxy_response = requests.get(requestedurl)

    print("Status " + proxy_response.status_code)
    response = HttpResponse(proxy_response.body, content_type=proxy_response.headers['content-type'])
    response.status_code = proxy_response.status_code
    response["Access-Control-Allow-Origin"] = "https://gcls.herokuapp.com"
    response["Access-Control-Allow-Credentials"] = "true"
    return response