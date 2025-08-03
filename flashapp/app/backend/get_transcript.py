from youtube_transcript_api import YouTubeTranscriptApi
from bs4 import BeautifulSoup
import requests

# url = "https://en.wikipedia.org/wiki/Hessa_Al_Jaber#:~:text=Hessa%20bint%20Sultan%20Al%20Jaber,Qatari%20engineer%2C%20academic%20and%20politician."
# result = requests.get(url)
# print(result.text)
def transcript(link: str):
    try:
        id = link.split('v=')[1]
        print(f"Extracted ID: {id}")
        srt = YouTubeTranscriptApi.get_transcript(id)
        s = ''
        for i in srt:
            s += i['text'] + ' '
        print(s)
    except IndexError:
        id = None
    if not id:
        id = link.split('/')[-1]
        print(f"Extracted ID: {id}")
        srt = YouTubeTranscriptApi.get_transcript(id)
        s = ''
        for i in srt:
            s += i['text'] + ' '
        print(s)
    return s



#.\venv\Scripts\python.exe -m pip install requests
#https://en.wikipedia.org/wiki/Hessa_Al_Jaber#:~:text=Hessa%20bint%20Sultan%20Al%20Jaber,Qatari%20engineer%2C%20academic%20and%20politician.