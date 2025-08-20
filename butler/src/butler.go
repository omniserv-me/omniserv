package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
)

func main() {
	reader := bufio.NewReader(os.Stdin)
	for {
		line := read_input(reader)
		fmt.Println(line)
	}
}

func read_input(reader *bufio.Reader) string {
	fmt.Print("[Butler]: ")
	line, err := reader.ReadString('\n')
	if err != nil {
		log.Panicf("[Butler] Failed to read CLI: %v", err)
	}
	return line
}
