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
  fprintf(stderr, "%s", s);
  exit(1);
}

int main(int argc, char **argv) {
  if (argc != 3) {
    fprintf(stderr, "usage - %s <ip> <port>\n", argv[0]);
  }

  char *ip = argv[1];
  int port = atoi(argv[2]);

  int my_socket = socket(AF_INET, SOCK_STREAM, 0);
  if (my_socket < 0) {
    die("socket creation failed");
  }

  struct sockaddr_in servaddr;
  memset(&servaddr, 0, sizeof(servaddr));
  servaddr.sin_family = AF_INET;
  servaddr.sin_addr.s_addr = inet_addr(ip); // Don't care about network interface
  servaddr.sin_port = htons(port);

  if (connect(my_socket, (struct sockaddr *) &servaddr, sizeof(servaddr)) < 0) {
    die("connect failed");
  }
  
  int command_length = 10;
  command_length = htonl(command_length);
  int sent = send(my_socket, &command_length, sizeof(command_length), 0);
  if (!sent) {
    die("command length send failed");
  }
  char *command = "0123456789";
  sent = send(my_socket, command, 10, 0);
  if (!sent) {
    die("command send failed");
  }

  close(my_socket);
}
