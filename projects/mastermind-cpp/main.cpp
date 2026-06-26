#include <iostream>
#include "mastermind.h"
#include <omp.h>
#include <chrono>

int main() {
    // If using parallel, set number of threads to use
    omp_set_num_threads(6); // For example, use 6 threads

    // Create a mastermind game with specified code length
    mastermind game(4);

    /**  There are four different methods to run the game.
     *   The first is to normally play the game which will give you the option
     *      to choose the secret code or randomly generate it
     *   The second is a bruteforce search for the code, which can often be faster than the
     *      Donald Knuth algorithm unless the codelength is large, but demonstrates a bad way
     *      to find the code
     *   The third and fourth both implement the Donald Knuth five-guess algorithm with the latter
     *      implementing the use of parallel computing to work even faster
     *   Note that this program was not implemented for speed per se, because it still uses strings
     *      for the code and colors which is inefficient.
     */

    // 1. Normal playing
    game.play();

    // 2. Brute force search for the code
    game.playBruteForce();

    // 3. Donald Knuth five-guess algorithm without parallel
    game.playDonaldKnuth();

    // 4. Donald Knuth five-guess algorithm with parallel
    game.playDonaldKnuthParallel();
}