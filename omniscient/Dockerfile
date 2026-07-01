FROM python
WORKDIR /omniscient
COPY . .
RUN ["pip", "install", "-r", "requirements.txt"]
EXPOSE 5003
CMD ["python", "main.py"]