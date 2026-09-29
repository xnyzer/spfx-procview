package main

import "testing"

func TestGreet(t *testing.T) {
	if got, want := greet("world"), "Hello, world!"; got != want {
		t.Errorf("greet() = %q, want %q", got, want)
	}
}
