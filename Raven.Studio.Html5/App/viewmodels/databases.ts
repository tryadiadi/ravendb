import app = require("durandal/app");
import router = require("plugins/router");

import appUrl = require("common/appUrl");
import database = require("models/database");
import createDatabase = require("viewmodels/createDatabase");
import getDatabaseStatsCommand = require("commands/getDatabaseStatsCommand");
import getDatabasesCommand = require("commands/getDatabasesCommand");
import deleteDatabaseConfirm = require("viewmodels/deleteDatabaseConfirm");

class databases {

    databases = ko.observableArray<database>();
    searchText = ko.observable("");
    selectedDatabase = ko.observable<database>();

    constructor() {
        this.searchText.subscribe(s => this.filterDatabases(s));
    }

    activate(navigationArgs) {
        new getDatabasesCommand()
            .execute()
            .done((results: database[]) => this.databasesLoaded(results));
    }

    navigateToDocuments(db: database) {
        db.activate();
        router.navigate(appUrl.forDocuments(null, db));
    }

    getDocumentsUrl(db: database) {
        return appUrl.forDocuments(null, db);
    }

    databasesLoaded(results: Array<database>) {

        var systemDatabase = new database("<system>");
        systemDatabase.isSystem = true;

        this.databases(results.concat(systemDatabase));

        // If we have just a few databases, grab the db stats for all of them.
        // (Otherwise, we'll grab them when we click them.)
        var few = 20;
        if (results.length < 20) {
            results.forEach(db => this.fetchStats(db));
        }

        // If we have no databases, show the "create a new database" screen.
        if (results.length === 0) {
            this.newDatabase();
        }
    }

    newDatabase() {
        var createDatabaseViewModel = new createDatabase();
        createDatabaseViewModel
            .creationTask
            .done((databaseName: string) => this.databases.unshift(new database(databaseName)));
        app.showDialog(createDatabaseViewModel);
    }

    fetchStats(db: database) {
        new getDatabaseStatsCommand(db)
            .execute()
            .done(result => db.statistics(result));
    }

    selectDatabase(db: database) {
        this.databases().forEach(d => d.isSelected(d === db));
        db.activate();
        this.selectedDatabase(db);
    }

    goToDocuments(db: database) {
        // TODO: use appUrl for this.
        router.navigate("#documents?database=" + db.name);
    }

    filterDatabases(filter: string) {
        var filterLower = filter.toLowerCase();
        this.databases().forEach(d => {
            var isMatch = !filter || d.name.toLowerCase().indexOf(filterLower) >= 0;
            d.isVisible(isMatch);
        });
    }

    deleteSelectedDatabase() {
        var db = this.selectedDatabase();
        var systemDb = this.databases.first(db => db.isSystem);
        if (db && systemDb) {
            var confirmDeleteVm = new deleteDatabaseConfirm(db, systemDb);
            confirmDeleteVm.deleteTask.done(() => this.onDatabaseDeleted(db));
            app.showDialog(confirmDeleteVm);
        }
    }

    onDatabaseDeleted(db: database) {
        this.databases.remove(db);
        if (this.selectedDatabase() === db) {
            this.selectedDatabase(null);
        }
    }
}

export = databases; 