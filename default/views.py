from django.shortcuts import render
from django.http import HttpResponse
import requests, requests.utils


# Create your views here.
def corsproxy(request, requestedurl):

    proxy_response = requests.get(requestedurl)

    response = HttpResponse(proxy_response.body, content_type=proxy_response.headers['content-type'])
    response.status_code = status_code
    response["Access-Control-Allow-Origin"] = "https://gcls.herokuapp.com"
    response["Access-Control-Allow-Credentials"] = "true"
    return response