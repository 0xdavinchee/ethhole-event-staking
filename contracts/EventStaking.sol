//SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "hardhat/console.sol";

contract EventStaking {
    struct RSVPDetails {
        bool hasRSVP;
        bool isCheckedIn;
    }
    uint256 public eventTime;
    uint256 private numCheckedIn;
    uint256 public amountStaked;
    uint256 public checkInFee;
    address public eventPlanner;
    mapping(address => RSVPDetails) public addressRSVPMap;

    event RSVPEvent(address attendant, uint256 amountStaked);
    event CheckInEvent(address attendant, uint256 amountStaked);
    event WithdrawFlakersStake(address withdrawer, uint256 amountWithdrawn);

    constructor(uint256 _eventTime, uint256 _checkInFee) {
        eventTime = _eventTime;
        checkInFee = _checkInFee;
        eventPlanner = msg.sender;
    }

    modifier beforeEventEnds() {
        require(block.timestamp < eventTime, "The event is over.");
        _;
    }

    function rsvp() external payable beforeEventEnds {
        require(msg.sender != eventPlanner, "You are the event planner.");
        require(
            addressRSVPMap[msg.sender].isCheckedIn == false,
            "You are already checked in."
        );
        require(
            addressRSVPMap[msg.sender].hasRSVP == false,
            "You have already RSVP'd."
        );
        require(msg.value == checkInFee, "You must pay the fee amount to RSVP");

        addressRSVPMap[msg.sender] = RSVPDetails(true, false);
        amountStaked += msg.value;
        emit RSVPEvent(msg.sender, amountStaked);
    }

    function checkIn(address _attendant) external beforeEventEnds {
        require(
            msg.sender == eventPlanner,
            "You don't have permission to check people in."
        );
        require(
            addressRSVPMap[_attendant].hasRSVP == true,
            "This address does not belong to anyone who RSVP'd."
        );

        addressRSVPMap[_attendant].isCheckedIn = true;
        numCheckedIn += 1;
        (bool sent, ) = msg.sender.call{value: checkInFee}("");
        require(sent, "There was an error sending you your funds.");
        amountStaked -= checkInFee;

        emit CheckInEvent(_attendant, amountStaked);
    }

    function withdrawFlakersStake() external payable {
        require(block.timestamp >= eventTime, "The event hasn't started yet");
        require(
            addressRSVPMap[msg.sender].isCheckedIn == true,
            "You are not eligible to withdraw."
        );
        uint256 flakersStakeAmount = amountStaked / numCheckedIn;
        (bool sent, ) = msg.sender.call{value: flakersStakeAmount}("");
        require(sent, "There was an error sending you your funds.");

        emit WithdrawFlakersStake(msg.sender, flakersStakeAmount);
    }

    receive() external payable {}
}
