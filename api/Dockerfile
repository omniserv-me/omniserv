FROM python
WORKDIR /api
EXPOSE 5006
COPY . .
RUN ["pip", "install", "-r", "requirements.txt"]
CMD ["python", "api.py"]