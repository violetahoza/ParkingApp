-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------
-- -----------------------------------------------------
-- Schema smart_parking
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema smart_parking
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `smart_parking` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci ;
USE `smart_parking` ;

-- -----------------------------------------------------
-- Table `smart_parking`.`parking_lots`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `smart_parking`.`parking_lots` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `address` TEXT NOT NULL,
  `latitude` DECIMAL(10,8) NOT NULL,
  `longitude` DECIMAL(11,8) NOT NULL,
  `total_spots` INT NOT NULL,
  `hourly_rate` DECIMAL(8,2) NOT NULL,
  `operating_hours_start` TIME NULL DEFAULT '00:00:00',
  `operating_hours_end` TIME NULL DEFAULT '23:59:59',
  `description` TEXT NULL DEFAULT NULL,
  `amenities` JSON NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_parking_lots_location` (`latitude` ASC, `longitude` ASC) VISIBLE)
ENGINE = InnoDB
AUTO_INCREMENT = 6
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `smart_parking`.`parking_spots`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `smart_parking`.`parking_spots` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `lot_id` INT NOT NULL,
  `spot_number` VARCHAR(10) NOT NULL,
  `is_available` TINYINT(1) NULL DEFAULT '1',
  `spot_type` ENUM('regular', 'disabled', 'electric', 'compact') NULL DEFAULT 'regular',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `unique_spot_per_lot` (`lot_id` ASC, `spot_number` ASC) VISIBLE,
  INDEX `idx_parking_spots_lot_available` (`lot_id` ASC, `is_available` ASC) VISIBLE,
  CONSTRAINT `parking_spots_ibfk_1`
    FOREIGN KEY (`lot_id`)
    REFERENCES `smart_parking`.`parking_lots` (`id`)
    ON DELETE CASCADE)
ENGINE = InnoDB
AUTO_INCREMENT = 3068
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `smart_parking`.`users`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `smart_parking`.`users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `email` (`email` ASC) VISIBLE,
  INDEX `idx_users_email` (`email` ASC) VISIBLE)
ENGINE = InnoDB
AUTO_INCREMENT = 10
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `smart_parking`.`reservations`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `smart_parking`.`reservations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `spot_id` INT NOT NULL,
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME NOT NULL,
  `total_cost` DECIMAL(8,2) NOT NULL,
  `status` ENUM('active', 'completed', 'cancelled') NULL DEFAULT 'active',
  `payment_status` ENUM('pending', 'paid', 'failed', 'refunded') NULL DEFAULT 'pending',
  `payment_method` VARCHAR(50) NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `hourly_rate` DECIMAL(8,2) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_reservations_user_status` (`user_id` ASC, `status` ASC) VISIBLE,
  INDEX `idx_reservations_spot_time` (`spot_id` ASC, `start_time` ASC, `end_time` ASC) VISIBLE,
  CONSTRAINT `reservations_ibfk_1`
    FOREIGN KEY (`user_id`)
    REFERENCES `smart_parking`.`users` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `reservations_ibfk_2`
    FOREIGN KEY (`spot_id`)
    REFERENCES `smart_parking`.`parking_spots` (`id`)
    ON DELETE CASCADE)
ENGINE = InnoDB
AUTO_INCREMENT = 26
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `smart_parking`.`payment_transactions`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `smart_parking`.`payment_transactions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `reservation_id` INT NOT NULL,
  `amount` DECIMAL(8,2) NOT NULL,
  `payment_method` VARCHAR(50) NOT NULL,
  `transaction_id` VARCHAR(255) NULL DEFAULT NULL,
  `status` ENUM('pending', 'completed', 'failed', 'refunded') NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `reservation_id` (`reservation_id` ASC) VISIBLE,
  CONSTRAINT `payment_transactions_ibfk_1`
    FOREIGN KEY (`reservation_id`)
    REFERENCES `smart_parking`.`reservations` (`id`)
    ON DELETE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `smart_parking`.`user_profiles`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `smart_parking`.`user_profiles` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NULL DEFAULT NULL,
  `license_plate` VARCHAR(20) NULL DEFAULT NULL,
  `profile_image_url` TEXT NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user_profiles_user_id` (`user_id` ASC) VISIBLE,
  CONSTRAINT `user_profiles_ibfk_1`
    FOREIGN KEY (`user_id`)
    REFERENCES `smart_parking`.`users` (`id`)
    ON DELETE CASCADE)
ENGINE = InnoDB
AUTO_INCREMENT = 10
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `smart_parking`.`user_vehicles`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `smart_parking`.`user_vehicles` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `license_plate` VARCHAR(20) NOT NULL,
  `make` VARCHAR(50) NOT NULL,
  `model` VARCHAR(50) NOT NULL,
  `color` VARCHAR(30) NULL DEFAULT NULL,
  `year` INT NULL DEFAULT NULL,
  `is_primary` TINYINT(1) NULL DEFAULT '0',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user_vehicles_user_id` (`user_id` ASC) VISIBLE,
  INDEX `idx_user_vehicles_license_plate` (`license_plate` ASC) VISIBLE,
  CONSTRAINT `user_vehicles_ibfk_1`
    FOREIGN KEY (`user_id`)
    REFERENCES `smart_parking`.`users` (`id`)
    ON DELETE CASCADE)
ENGINE = InnoDB
AUTO_INCREMENT = 7
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;

USE `smart_parking` ;

-- -----------------------------------------------------
-- Placeholder table for view `smart_parking`.`parking_lot_availability`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `smart_parking`.`parking_lot_availability` (`id` INT, `name` INT, `address` INT, `latitude` INT, `longitude` INT, `total_spots` INT, `hourly_rate` INT, `available_spots` INT, `total_created_spots` INT, `operating_hours_start` INT, `operating_hours_end` INT, `description` INT, `amenities` INT);

-- -----------------------------------------------------
-- Placeholder table for view `smart_parking`.`user_reservation_history`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `smart_parking`.`user_reservation_history` (`reservation_id` INT, `email` INT, `first_name` INT, `last_name` INT, `parking_lot_name` INT, `spot_number` INT, `start_time` INT, `end_time` INT, `total_cost` INT, `status` INT, `payment_status` INT, `created_at` INT);

-- -----------------------------------------------------
-- View `smart_parking`.`parking_lot_availability`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `smart_parking`.`parking_lot_availability`;
USE `smart_parking`;
CREATE  OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `smart_parking`.`parking_lot_availability` AS select `pl`.`id` AS `id`,`pl`.`name` AS `name`,`pl`.`address` AS `address`,`pl`.`latitude` AS `latitude`,`pl`.`longitude` AS `longitude`,`pl`.`total_spots` AS `total_spots`,`pl`.`hourly_rate` AS `hourly_rate`,count((case when (`ps`.`is_available` = true) then 1 end)) AS `available_spots`,count(`ps`.`id`) AS `total_created_spots`,`pl`.`operating_hours_start` AS `operating_hours_start`,`pl`.`operating_hours_end` AS `operating_hours_end`,`pl`.`description` AS `description`,`pl`.`amenities` AS `amenities` from (`smart_parking`.`parking_lots` `pl` left join `smart_parking`.`parking_spots` `ps` on((`pl`.`id` = `ps`.`lot_id`))) group by `pl`.`id`;

-- -----------------------------------------------------
-- View `smart_parking`.`user_reservation_history`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `smart_parking`.`user_reservation_history`;
USE `smart_parking`;
CREATE  OR REPLACE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `smart_parking`.`user_reservation_history` AS select `r`.`id` AS `reservation_id`,`u`.`email` AS `email`,`up`.`first_name` AS `first_name`,`up`.`last_name` AS `last_name`,`pl`.`name` AS `parking_lot_name`,`ps`.`spot_number` AS `spot_number`,`r`.`start_time` AS `start_time`,`r`.`end_time` AS `end_time`,`r`.`total_cost` AS `total_cost`,`r`.`status` AS `status`,`r`.`payment_status` AS `payment_status`,`r`.`created_at` AS `created_at` from ((((`smart_parking`.`reservations` `r` join `smart_parking`.`users` `u` on((`r`.`user_id` = `u`.`id`))) join `smart_parking`.`user_profiles` `up` on((`u`.`id` = `up`.`user_id`))) join `smart_parking`.`parking_spots` `ps` on((`r`.`spot_id` = `ps`.`id`))) join `smart_parking`.`parking_lots` `pl` on((`ps`.`lot_id` = `pl`.`id`)));

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
