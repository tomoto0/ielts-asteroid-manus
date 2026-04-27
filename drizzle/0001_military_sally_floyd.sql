CREATE TABLE `gameScores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playerName` varchar(64) NOT NULL,
	`score` int NOT NULL,
	`wordsDestroyed` int NOT NULL DEFAULT 0,
	`language` varchar(8) NOT NULL DEFAULT 'ja',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gameScores_id` PRIMARY KEY(`id`)
);
