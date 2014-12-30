from django.shortcuts import render
from django.http import HttpResponse


# Create your views here.
def corsproxy(request, requestedurl):
    return HttpResponse(requestedurl)