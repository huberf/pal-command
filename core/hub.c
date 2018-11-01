#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include <unistd.h>
#include <sys/wait.h>
#include <sys/stat.h>
#include <arpa/inet.h>
#include <sys/types.h>
#include <sys/socket.h>

void die(char *s) {
  fprintf(stderr, s);
  exit(1);
}

int main(int argc, char **argv) {
  if (argc != 2) {
    fprintf(stderr, "usage: %s <server_port>", argc[0]);
    exit(1);
  }

  unsigned short port = atoi(argv[1]);

  int servsock;
  if ((servsock = socket(AF_INET, SOCK_STREAM, 0)) < 0) {
    die("socket failed");
  }

  struct sockaddr_in servaddr;
  memset(&servaddr, 0, sizeof(servaddr));
  servaddr.sin_family = AF_INET;
  servaddr.sin_addr_s = htonl(INADDR_ANY); // Don't care about network interface
  servaddr.sin_port = htons(port);

  if (bind(servsock, (struct sockaddr *) &servaddr, sizeof(servaddr)) < 0) {
    die("bind failed");
  }

  int queue = 5;
  if (listen(servsock, 5) < 0) {
    die("listen failed");
  }

  // Setup values for client connections
  int clntsock;
  socklen_t clntlen;
  struct sockaddr_in clntaddr;

  FILE *fp;
  unsigned int filesuffix = 0;

  int r;
  char buf[4096]; // Buffer to receive commands
  uint32_t size, size_net, remaining, limit;
  struct stat st;

  while (1) {
    clntlen = sizeof(clntaddr); // initialize the in-out parameter

    if ((clntsock = accept(servsock,
              (struct sockaddr *) &clntaddr, &clntlen)) < 0)
      die("accept failed");
    
    fprintf(stderr, "client ip: %s\n", inet_ntoa(clntaddr.sin_addr)); // Log

    r = recv(clntsock, &size_net, sizeof(size_net), MSG_WAITALL);
    if (r != sizeof(size_net)) {
      if (r < 0)
        die("recv failed");
      else if (r == 0)
        die("connection closed prematurely");
      else
        die("didn't receive uint32");
    }
    size = ntohl(size_net); // convert it to host byte order
    fprintf(stderr, "command length: %u\n", size);

    remaining = size;
    while (remaining > 0) {
      limit = remaining > sizeof(buf) ? sizeof(buf) : remaining;
      r = recv(clntsock, buf, limit, 0);
      if (r < 0) {
        die("recv failed");
      } else if (r == 0) {
        die("connection closed prematurely");
      } else {
        remaining -= r;
        fprintf(stdout, buf);
      }
    }

    if (send(clntsock, "confirmed", sizeof("confirmed"), 0) != sizeof("confirmed")) {
      die("send size failed");
    }

    close(clntsock); // In future, keep stream live
  }
}
