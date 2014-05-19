/// <reference path="../typings/tsd.d.ts" />

'use strict';

import util = require('util');
import path = require('path');
import fs = require('fs');
import yeoman = require('yeoman-generator');
import chalk = require('chalk');
import findup = require('findup-sync');
import open = require('open');

var greet: string = '';
greet = <any>chalk.bold.blue('   ___ _____                  _ \n');
greet += <any>chalk.bold.blue('  |   \\_   _|  _ _ __  ___ __| |\n');
greet += <any>chalk.bold.blue('  | |) || || || | \'_ \\/ -_) _` |\n');
greet += <any>chalk.bold.blue('  |___/ |_| \\_, | .__/\\___\\__,_|\n');
greet += <any>chalk.bold.blue('            |__/|_|             \n');

interface IEnvironment {
    verify(): boolean;
    getRoot(): string;
}

class DefTypedEnvironment implements IEnvironment {
    verify(): boolean {
        var pkg = findup('package.json');

        if (pkg == null) {
            return false;
        }

        var pkgFile = require(pkg);
        return pkgFile.name === 'DefinitelyTyped';
    }

    public getRoot(): string {
        if (this.verify()) {
            var root = path.dirname(findup('package.json'));
            return path.resolve(root);
        }
        return null;
    }
}

class TsdEnvironment implements IEnvironment {
    path: string;

    verify(): boolean {
        var pkg = findup('tsd.json');

        if (pkg == null) {
            return false;
        }

        var pkgFile = require(pkg);

        var root = path.dirname(findup('tsd.json'));
        this.path = path.join(path.resolve(root), pkgFile.path);

        return pkgFile.path != null;
    }

    public getRoot(): string {
        if (this.verify()) {
            return path.resolve(this.path);
        }
        return null;
    }
}

class EnvironmentDiscovery {
    static isDefTypedEnvironment(): boolean {
        var env = new DefTypedEnvironment();
        return env.verify();
    }

    static defTypedRoot(): string {
        var env = new DefTypedEnvironment();
        return env.getRoot();
    }

    static isTsdEnvironment(): boolean {
        var env = new TsdEnvironment();
        return env.verify();
    }

    static tsdRoot(): string {
        var env = new TsdEnvironment();
        return env.getRoot();
    }
}

interface DefTypedAnswers extends inquirer.Answers {
    typingName: string;
    typingVersion: string;
    libraryUrl: string;
    githubName: string;
    useSuggestedPath: boolean;
    moreInfoAtTheEnd: boolean;
}

var deftypedGenerator = yeoman.generators.Base.extend({

    init: function () {
        var self: DefTypedAnswers = this;
        this.on('end', function() {
            if (!this.options['skip-install']) {
                if (self.moreInfoAtTheEnd) {
                    open('http://definitelytyped.org/guides/creating.html');
                }
            }
        });
    },

    askFor: function() {
        var done = this.async();

        this.log(greet);
        this.log(chalk.white(' Welcome to DefinitelyTyped typing boilerplate!\n'));

        var prompts: Array<inquirer.Question> = [];

        if (EnvironmentDiscovery.isDefTypedEnvironment()) {
            if (EnvironmentDiscovery.defTypedRoot() !== path.resolve('.')) {
                prompts.push({
                    type: 'confirm',
                    name: 'useSuggestedPath',
                    message: 'Hey! Looks like you\'re in a DefinitelyTyped repository.\n ' +
                    'Would you like to create the typing at ".\\' + path.relative('.', EnvironmentDiscovery.defTypedRoot()) + '\\" dir?'
                });
            }
        } else if (EnvironmentDiscovery.isTsdEnvironment()) {
            if (EnvironmentDiscovery.tsdRoot() !== path.resolve('.')) {
                prompts.push({
                    type: 'confirm',
                    name: 'useSuggestedPath',
                    message: 'Hey! Looks like you\'re using TSD tool!\n ' +
                    'Would you like to create the typing at ".\\' + path.relative('.', EnvironmentDiscovery.tsdRoot()) + '\\" dir?'
                });
            }
        }

        prompts.push({
            name: 'typingName',
            message: 'Please, inform the typing name?',
            validate: (answer: string) => {
                if (answer) {
                    return answer.trim() !== '';
                }
                return false;
            }
        });

        prompts.push({
            name: 'typingVersion',
            message: 'What the typing version?'
        });

        prompts.push({
            name: 'libraryUrl',
            message: 'What the project library url?',
            validate: (answer: string) => {
                if (answer) {
                    return answer.trim() !== '';
                }
                return false;
            }
        });

        prompts.push({
            name: 'githubName',
            message: 'Inform your Github name?',
            validate: (answer: string) => {
                if (answer) {
                    return answer.trim() !== '';
                }
                return false;
            }
        });

        prompts.push({
            type: 'confirm',
            name: 'moreInfoAtTheEnd',
            message: 'Would you like more information about how to create TypeScript definitions\n at the end of this installation?',
            default: 'Y'
        });

        this.prompt(prompts, function (props: DefTypedAnswers) {
            this.typingName = props.typingName;
            this.libraryUrl = props.libraryUrl;
            this.githubName = props.githubName;
            this.typingVersion = props.typingVersion;
            this.useSuggestedPath = props.useSuggestedPath;
            this.moreInfoAtTheEnd = props.moreInfoAtTheEnd;

            var typingDir: string = './';

            if (this.useSuggestedPath) {
                if (EnvironmentDiscovery.isDefTypedEnvironment()) {
                    typingDir = path.relative('.', EnvironmentDiscovery.defTypedRoot());
                } else if (EnvironmentDiscovery.isTsdEnvironment()) {
                    typingDir = path.relative('.', EnvironmentDiscovery.tsdRoot());
                }
            }

            typingDir = path.join(typingDir, this.typingName);

            if (fs.existsSync(typingDir)) {
                throw new Error('The directory: "' + typingDir + '" already exists.');
            }

            this.typingDir = typingDir;

            done();
        }.bind(this));
    },

    app: function() {
        this.mkdir('./' + this.typingDir);
        this.template('_typing.d.ts.tmpl', this.typingDir + '/' + this.typingName + '.d.ts');
        this.template('_typing-tests.ts.tmpl', this.typingDir + '/' + this.typingName + '-tests.ts');
        this.template('_typing-tests.ts.tscparams.tmpl', this.typingDir + '/' + this.typingName + '-tests.ts.tscparams');
    }
});

module.exports = deftypedGenerator;
