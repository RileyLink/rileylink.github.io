#ifndef MASTERMIND_H
#define MASTERMIND_H
#include <list>
#include <string>

using namespace std;
#include <vector>


class mastermind {
public:
    void instructions();

    mastermind();
    explicit mastermind(int codelength);

    void play();
    void playBruteForce();
    bool playDonaldKnuth();
    bool playDonaldKnuthParallel();

    int playDonaldKnuth(const string& secretCode);

    vector<string> generateCombinations();
private:
    int CODELENGTH;

    string createSecretCode();

    static string pickGuess(const vector<string> &guesses, vector<string> candidateSolutions);

    static bool removeCode(vector<string> &v, const string &s);

    static bool removeCode(list<string> &v, const string &s);

    string chooseSecretCode();

    bool isValidCode(const string &code);

    void recurGenerate(string prefix, vector<string> &result);

    bool checkGuess(string &secretCode, vector<string> guesses);

    string score(string secretCode, string guess);

    vector<string> score(const string& secretCode, const vector<string>& guesses);
};



#endif //MASTERMIND_H
