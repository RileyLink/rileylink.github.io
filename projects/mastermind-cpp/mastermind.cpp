#include "mastermind.h"
using namespace std;
#include <iostream>
#include <random>
#include <iomanip>
#include <unordered_map>
#include <algorithm>
#include <chrono>  // for timing

const char colors[] = {'R', 'W', 'Y', 'G', 'B', 'K'};

mastermind::mastermind(){
    CODELENGTH = 4;
}

mastermind::mastermind(int codelength) : CODELENGTH(codelength){

}

string mastermind::score(string secretCode, string guess) {
    //converts to vector<char> because I am lazy and didnt change the original code I wrote
    vector<char> vecSecretCode(secretCode.begin(),secretCode.end());
    vector<char> vecGuess(guess.begin(),guess.end());

    string score;
    int atCount = 0; // Count for correct characters and positions
    int oCount = 0; // Count for correct characters but wrong positions

    // Create two vectors to track matched positions
    vector<bool> secretMatched(CODELENGTH, false);
    vector<bool> guessMatched(CODELENGTH, false);

    // First pass: Count exact matches ('@')
    for (int i = 0; i < CODELENGTH; i++) {
        if (guess[i] == secretCode[i]) {
            atCount++;
            secretMatched[i] = true; // Mark this character as matched
            guessMatched[i] = true;   // Mark this character as matched
        }
    }

    // Second pass: Count color matches ('o')
    for (int i = 0; i < CODELENGTH; i++) {
        if (!guessMatched[i]) { // Only consider unmatched guesses
            for (int j = 0; j < CODELENGTH; j++) {
                if (!secretMatched[j] && guess[i] == secretCode[j]) {
                    oCount++;
                    secretMatched[j] = true; // Mark this character as matched
                    break; // Move to the next guess after finding a match
                }
            }
        }
    }

    // Build the score string with all '@' first, followed by 'o'
    score.append(atCount, '@'); // Append '@' at count times
    score.append(oCount, 'o');   // Append 'o' at count times

    return score;
}

vector<string> mastermind::score(const string& secretCode, const vector<string>& guesses) {
    vector<string> guessScores;
    for (const auto & guess : guesses) {
        guessScores.push_back(score(secretCode, guess));
    }
    return guessScores;
}

bool mastermind::checkGuess(string& secretCode, vector<string> guesses) {
    vector<string> guessesStrings(guesses.size());
    vector<string> scores = score(secretCode, guesses);

    for (int i=0; i<guesses.size(); i++) {
        guessesStrings[i] = string(guesses[i].begin(),guesses[i].end());
    }

    // Set the width for the columns
    const int colWidth = 15;
    // Print table header
    cout << setw(colWidth) << left << "Guess"
         << setw(colWidth) << left << "Score" << endl;
    // Print separator
    cout << setw(colWidth * 2) << setfill('-') << "" << setfill(' ') << endl;
    // Print table rows (BLANK as a placeholder)
    for (int i = 0; i < guesses.size(); ++i) {  // For demo, prints 3 rows
        cout << setw(colWidth) << left << guessesStrings[i] << setw(colWidth) << left << scores[i] << endl;
    }

    string correctScore;
    correctScore.append(CODELENGTH, '@');
    // Check if the last guess matches the secret code
    return scores.back() == correctScore; // Check last score against secret code
}

string mastermind::createSecretCode() {
    vector<char> secretCode(CODELENGTH);

    random_device rd; // Non-deterministic random device for seeding
    mt19937 gen(rd()); // Mersenne Twister engine seeded with random device
    uniform_int_distribution<> dist(0, 5); // Uniform distribution in the range [0, 5]

    for (int i=0; i<CODELENGTH; i++) {
        secretCode[i] = colors[dist(gen)];
    }
    return string(secretCode.begin(),secretCode.end());
}

string mastermind::pickGuess(const vector<string>& guesses, vector<string> candidateSolutions) {
    // First loop: Find a possible guess in candidateSolutions (now a list)
    for (const string& possibleGuess : guesses) {
        if (find(candidateSolutions.begin(), candidateSolutions.end(), possibleGuess) != candidateSolutions.end()) {
            return possibleGuess;
        }
    }

    // Second loop: Find a possible guess in combinations
    return guesses.at(0);
}

bool mastermind::removeCode(vector<string>& v, const string& s) {
    auto it = find(v.begin(), v.end(), s); // Search for the string
    if (it != v.end()) {
        v.erase(it);
        return true; // Indicate successful removal
    }
    return false; // Indicate that the string was not found
}

bool mastermind::removeCode(list<string>& v, const string& s) {
    // Search for the string in the list
    auto it = find(v.begin(), v.end(), s);
    if (it != v.end()) {
        v.erase(it); // Erase the element
        return true; // Indicate successful removal
    }
    return false; // Indicate that the string was not found
}

string mastermind::chooseSecretCode() {
    string code;
    do {
        cout << "Please input your secret code as a " << to_string(CODELENGTH) << "-letter combination of the colors (R,W,Y,G,B,K)" << endl;
        cin >> code;
    } while (!(code.size() == CODELENGTH && isValidCode(code)));
    return code;
}

bool mastermind::isValidCode(const string& code) {
    if (code.size() != CODELENGTH) {
        return false;
    }
    for (char c : code) {
        if (c != 'R' && c != 'W' && c != 'Y' && c != 'G' && c != 'B' && c != 'K') {
            return false; // Return false if any character is invalid
        }
    }
    return true;
}

void mastermind::recurGenerate(string prefix, vector<string>& result) {
    if (prefix.length() == CODELENGTH) {
        result.push_back(prefix);  // Store the complete combination
        return;
    }

    for (char c : colors) {  // Loop through available colors
        recurGenerate(prefix + c, result);  // Recursively add next color
    }
}

vector<string> mastermind::generateCombinations() {
    vector<string> result;
    recurGenerate("", result);  // Call recursive helper function
    return result;         // Return the vector of all combinations
}

void mastermind::instructions() {
    cout << endl;
    cout << "The objective of the game is to guess a secret code consisting of colored pegs" << endl;
    cout << "The secret code is a row of " << to_string(CODELENGTH) << " pegs that may be chosen (with repeats) from the colors: " << endl;
    cout << "red (R), white (W), yellow (Y), green (G), blue (B), and black (K)" << endl;
    cout << "Each guess of a possible secret code is scored to give some information about how close the guess is to the secret code" <<endl;
    cout << "Specifically the guess is scored by, " << endl;
    cout << "(1) How many of the code pegs in the guess are of the right color and right position." << endl;
    cout << "(2) How many of the code pegs are of the right colors i.e. occur somewhere in the secret code." << endl;
    cout << "\nThese two pieces of info are recorded in the form of @'s for item (1) and o's for item (2)" << endl;
    cout << "The game ends when the secret code is correctly guessed, i.e. a score of " << to_string(CODELENGTH) << " @'s is given." << endl;
    cout << endl;
}

void mastermind::play() {
    string secretCode;
    string currentGuess;
    vector<string> guesses;

    cout << "Welcome to MasterMind. Do you want to read the instructions? (Y/N)" << endl;
    string choice;
    cin >> choice;
    // If the user says 'yes', call the instructions function.
    if (choice == "y" || choice == "Y") {
        instructions();
    }

    do {
        cout << "Do you want to create the secret code or have it randomly generated? (choose/random)" << endl;
        cin >> choice;
    } while (((choice != "choose") && (choice != "random")));

    if (choice == "choose") {
        secretCode = chooseSecretCode();
    } else {
        secretCode = createSecretCode();
    }

    do {
        do {
            string guess;
            cout << "Guess a combination of secret code as a four-letter combination of the colors (R,W,Y,G,B,K)" << endl;
            cin >> guess;
            currentGuess = guess;
        } while(!isValidCode(currentGuess));
        guesses.push_back(currentGuess);
    } while(!checkGuess(secretCode, guesses));

    cout << endl;
    cout << "You correctly guessed the secret code in "<< to_string(guesses.size()) << "! Thanks for playing!" << endl;
}

void mastermind::playBruteForce() {
    string secretCode;
    vector<string> guesses;

    cout << "Welcome to MasterMind. Do you want to read the instructions? (Y/N)" << endl;
    string choice;
    cin >> choice;
    // If the user says 'yes', call the instructions function.
    if (choice == "y" || choice == "Y") {
        instructions();
    }

    do {
        cout << "Do you want to create the secret code or have it randomly generated? (choose/random)" << endl;
        cin >> choice;
    } while (((choice != "choose") && (choice != "random")));

    if (choice == "choose") {
        secretCode = chooseSecretCode();
    } else {
        secretCode = createSecretCode();
    }

    auto start = chrono::high_resolution_clock::now();
    vector<string> combinations = generateCombinations();
    string correctScore;
    correctScore.append(CODELENGTH, '@');
    try {
        for (const string& currentGuess : combinations) {
            guesses.push_back(currentGuess);
            if (score(secretCode, currentGuess) == correctScore) {
                checkGuess(secretCode,guesses);
                throw exception();
            }
        }
    } catch (const exception&) {
        // Record end time
        auto end = chrono::high_resolution_clock::now();

        cout << endl;
        cout << "The brute force approach took " << to_string(guesses.size())<< " guesses! Thanks for playing!" << endl;

        // Calculate the duration in milliseconds
        chrono::duration<double, milli> duration = end - start;
        // Output the elapsed time
        cout << "Function execution time: " << duration.count() << " ms" << endl;
    }
}

bool mastermind::playDonaldKnuth() {
    string secretCode;
    string currentGuess;
    vector<string> guesses;
    string currentScore;
    string correctScore;
    correctScore.append(CODELENGTH, '@');

    cout << "Welcome to MasterMind. Do you want to read the instructions? (Y/N)" << endl;
    string choice;
    cin >> choice;
    // If the user says 'yes', call the instructions function.
    if (choice == "y" || choice == "Y") {
        instructions();
    }

    do {
        cout << "Do you want to create the secret code or have it randomly generated? (choose/random)" << endl;
        cin >> choice;
    } while (((choice != "choose") && (choice != "random")));

    if (choice == "choose") {
        secretCode = chooseSecretCode();
    } else {
        secretCode = createSecretCode();
    }

    auto start = chrono::high_resolution_clock::now();
    vector<string> combinations = generateCombinations(); // All possible guesses
    vector<string> candidateSolutions(combinations.begin(),combinations.end());

    // Fill with alternating colors to get a balanced first guess
    for (int i = 0; i < CODELENGTH; ++i) {
        currentGuess += colors[i / 2];  // Repeat each color twice
    }

    guesses.push_back(currentGuess);
    do {
        //cout << "Candidates left: " << to_string(candidateSolutions.size()) << endl;

        // 1. Remove current guess from combinations and candidate solutions
        removeCode(combinations,currentGuess);
        removeCode(candidateSolutions,currentGuess);

        // 2. Play guess to get score
        currentScore = score(secretCode, currentGuess);

        // 3. If score is @@@@ then terminate
        if (currentScore == correctScore) {
            break;
        }

        // 4. Prune from candidate solutions any codes that would not give same response if it were the secret code
        for (auto it = candidateSolutions.begin(); it != candidateSolutions.end(); /* no increment here */) {
            if (score(*it, currentGuess) != currentScore) {
                it = candidateSolutions.erase(it); // Erase returns the next iterator
            } else {
                ++it; // Only increment if no erase happened
            }
        }

        // 5. Calculate minmax vector
        unordered_map<string,int> scoreCount;
        unordered_map<string,int> maxGuessVec;
        vector<string> minGuesses;
        for (const string& key : combinations) {
            // Count the scores for each possible guess
            for (const string& sol : candidateSolutions) {
                string pegScore = score(key, sol);
                scoreCount[pegScore]++;
            }
            if (key == "KKKB") {
                cout << "";
            }
            // find max score
            int max = 0;
            for (const auto& pair : scoreCount) {
                if (pair.second > max) {
                    max = pair.second;
                }
            }
            // clear score count
            scoreCount.clear();

            // Label the current key with the max
            maxGuessVec[key] = max;
        }

        // Find minimum
        int min = numeric_limits<int>::max();
        for (const auto& element : maxGuessVec) {
            if (element.second < min) {
                min = element.second;
            }
        }

        // Find all guesses with the minimum
        for (const auto& pair : maxGuessVec) {
            if (pair.second == min) {
                minGuesses.push_back(pair.first);
            }
        }

        // 6. Choose next guess by first checking if its in candidate solutions and then combinations
        currentGuess = pickGuess(minGuesses, candidateSolutions);

        guesses.push_back(currentGuess);

    } while (currentScore != correctScore); //guess score doesn't match final

    checkGuess(secretCode, guesses);
    cout << "The secret code was guessed in " << to_string(guesses.size()) << " guesses!" << endl;

    // Record end time
    auto end = chrono::high_resolution_clock::now();
    // Calculate the duration in milliseconds
    chrono::duration<double, milli> duration = end - start;

    // Output the elapsed time
    cout << "Function execution time: " << duration.count() << " ms" << endl;

    return true;
}

bool mastermind::playDonaldKnuthParallel() {
    string secretCode;
    string currentGuess;
    vector<string> guesses;
    string currentScore;
    string correctScore;
    correctScore.append(CODELENGTH, '@');

    cout << "Welcome to MasterMind. Do you want to read the instructions? (Y/N)" << endl;
    string choice;
    cin >> choice;
    // If the user says 'yes', call the instructions function.
    if (choice == "y" || choice == "Y") {
        instructions();
    }

    do {
        cout << "Do you want to create the secret code or have it randomly generated? (choose/random)" << endl;
        cin >> choice;
    } while (((choice != "choose") && (choice != "random")));

    if (choice == "choose") {
        secretCode = chooseSecretCode();
    } else {
        secretCode = createSecretCode();
    }

    auto start = chrono::high_resolution_clock::now();
    vector<string> combinations = generateCombinations(); // All possible guesses
    vector<string> candidateSolutions = combinations;

    // Fill with alternating colors to get a balanced first guess
    for (int i = 0; i < CODELENGTH; ++i) {
        currentGuess += colors[i / 2];  // Repeat each color twice
    }

    guesses.push_back(currentGuess);
    do {
        //cout << "Candidates left: " << to_string(candidateSolutions.size()) << endl;

        // 1. Remove current guess from combinations and candidate solutions
        removeCode(combinations,currentGuess);
        removeCode(candidateSolutions,currentGuess);

        // 2. Play guess to get score
        currentScore = score(secretCode, currentGuess);

        // 3. If score is @@@@ then terminate
        if (currentScore == correctScore) {
            break;
        }

        // 4. Prune from candidate solutions any codes that would not give same response if it were the secret code
        for (auto it = candidateSolutions.begin(); it != candidateSolutions.end(); /* no increment here */) {
            if (score(*it, currentGuess) != currentScore) {
                it = candidateSolutions.erase(it); // Erase returns the next iterator
            } else {
                ++it; // Only increment if no erase happened
            }
        }

        // 5. Calculate minmax vector
        //unordered_map<string,int> scoreCount;
        unordered_map<string,int> maxGuessVec;
        vector<string> minGuesses;

        #pragma omp parallel for
        for (int i = 0; i < combinations.size(); ++i) {
            const string& key = combinations[i];
            unordered_map<string, int> scoreCount;  // Private to each thread

            // Count the scores for each possible guess
            for (const string& sol : candidateSolutions) {
                string pegScore = score(key, sol);  // Use the memoized scoring function
                scoreCount[pegScore]++;
            }

            // Find the maximum score for the current guess
            int max = 0;
            for (const auto& pair : scoreCount) {
                if (pair.second > max) {
                    max = pair.second;
                }
            }

            #pragma omp critical  // Protect shared resource access
            {
                maxGuessVec[key] = max;
            }
        }

        // Find minimum
        int min = numeric_limits<int>::max();
        for (const auto& element : maxGuessVec) {
            if (element.second < min) {
                min = element.second;
            }
        }

        // Find all guesses with the minimum
        for (const auto& pair : maxGuessVec) {
            if (pair.second == min) {
                minGuesses.push_back(pair.first);
            }
        }

        // 6. Choose next guess by first checking if its in candidate solutions and then combinations
        currentGuess = pickGuess(minGuesses, candidateSolutions);

        guesses.push_back(currentGuess);

    } while (currentScore != correctScore); //guess score doesn't match final

    checkGuess(secretCode, guesses);
    cout << "The secret code was guessed in " << to_string(guesses.size()) << " guesses!" << endl;

    // Record end time
    auto end = chrono::high_resolution_clock::now();
    // Calculate the duration in milliseconds
    chrono::duration<double, milli> duration = end - start;
    // Output the elapsed time
    cout << "Function execution time: " << duration.count() << " ms" << endl;

    return true;
}

int mastermind::playDonaldKnuth(const string& secret) {
    const string& secretCode = secret;
    string currentGuess;
    vector<string> guesses;
    string currentScore;
    string correctScore;
    correctScore.append(CODELENGTH, '@');

    vector<string> combinations = generateCombinations(); // All possible guesses
    vector<string> candidateSolutions = combinations;

    // Fill with alternating colors to get a balanced first guess
    for (int i = 0; i < CODELENGTH; ++i) {
        currentGuess += colors[i / 2];  // Repeat each color twice
    }

    guesses.push_back(currentGuess);
    do {
        // 1. Remove current guess from combinations and candidate solutions
        removeCode(combinations,currentGuess);
        removeCode(candidateSolutions,currentGuess);

        // 2. Play guess to get score
        currentScore = score(secretCode, currentGuess);

        // 3. If score is @@@@ then terminate
        if (currentScore == correctScore) {
            break;
        }

        // 4. Prune from candidate solutions any codes that would not give same response if it were the secret code
        for (auto it = candidateSolutions.begin(); it != candidateSolutions.end(); /* no increment here */) {
            if (score(*it, currentGuess) != currentScore) {
                it = candidateSolutions.erase(it); // Erase returns the next iterator
            } else {
                ++it; // Only increment if no erase happened
            }
        }

        // 5. Calculate minmax vector
        unordered_map<string,int> scoreCount;
        unordered_map<string,int> maxGuessVec;
        vector<string> minGuesses;
        for (const string& key : combinations) {
            // Count the scores for each possible guess
            for (const string& sol : candidateSolutions) {
                string pegScore = score(key, sol);
                scoreCount[pegScore]++;
            }

            // find max score
            int max = 0;
            for (const auto& pair : scoreCount) {
                if (pair.second > max) {
                    max = pair.second;
                }
            }
            // clear score count
            scoreCount.clear();

            // Label the current key with the max
            maxGuessVec[key] = max;
        }

        // Find minimum
        int min = numeric_limits<int>::max();
        for (const auto& element : maxGuessVec) {
            if (element.second < min) {
                min = element.second;
            }
        }

        // Find all guesses with the minimum
        for (const auto& pair : maxGuessVec) {
            if (pair.second == min) {
                minGuesses.push_back(pair.first);
            }
        }

        // 6. Choose next guess by first checking if its in candidate solutions and then combinations
        currentGuess = pickGuess(minGuesses, candidateSolutions);

        guesses.push_back(currentGuess);

    } while (currentScore != correctScore); //guess score doesn't match final

    return static_cast<int>(guesses.size());
}
