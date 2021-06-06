import { expect } from "./chai-setup";
import { EventStaking } from "../typechain";
import {
  ethers,
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
} from "hardhat";
import { getDate, setupUser, setupUsers } from "./utils";

const RSVP_FEE = ethers.utils.parseEther("0.01");

const setup = async () => {
  await deployments.fixture(["EventStaking"]);
  const contracts = {
    EventStaking: (await ethers.getContract("EventStaking")) as EventStaking,
  };
  const { deployer } = await getNamedAccounts();
  const participants = await getUnnamedAccounts();

  return {
    deployer: await setupUser(deployer, contracts),
    ...contracts,
    participants: await setupUsers(participants, contracts),
  };
};

describe("EventStaking", () => {
  it("Should properly initialize", async () => {
    const { deployer, EventStaking } = await setup();
    expect(await EventStaking.eventPlanner()).to.equal(deployer.address);
    expect(await EventStaking.checkInFee()).to.equal(RSVP_FEE);
  });

  it("Should allow valid RSVP.", async () => {
    const { EventStaking, participants } = await setup();
    for (let i = 0; i < 3; i++) {
      await expect(
        participants[i].EventStaking.rsvp({
          value: RSVP_FEE,
        })
      )
        .to.emit(EventStaking, "RSVPEvent")
        .withArgs(participants[i].address, RSVP_FEE.mul(i + 1));
    }
  });

  it("Should catch invalid RSVP attempts.", async () => {
    const { EventStaking, participants } = await setup();

    await expect(EventStaking.rsvp({ value: RSVP_FEE })).to.be.revertedWith(
      "You are the event planner."
    );

    await participants[0].EventStaking.rsvp({ value: RSVP_FEE });
    await expect(
      participants[0].EventStaking.rsvp({ value: RSVP_FEE })
    ).to.be.revertedWith("You have already RSVP'd.");

    await EventStaking.checkIn(participants[0].address);
    await expect(
      participants[0].EventStaking.rsvp({ value: RSVP_FEE })
    ).to.be.revertedWith("You are already checked in.");

    await expect(participants[1].EventStaking.rsvp()).to.be.revertedWith(
      "You must pay the fee amount to RSVP"
    );
  });

  it("Should allow check in.", async () => {
    const { EventStaking, participants } = await setup();
    for (let i = 0; i < 3; i++) {
      await participants[i].EventStaking.rsvp({
        value: RSVP_FEE,
      });
    }
    for (let i = 2; i >= 0; i--) {
      await expect(EventStaking.checkIn(participants[i].address))
        .to.emit(EventStaking, "CheckInEvent")
        .withArgs(participants[i].address, RSVP_FEE.mul(i));
    }
  });

  it("Should catch invalid check in attempts.", async () => {
    const { deployer, EventStaking, participants } = await setup();
    await expect(
      participants[0].EventStaking.checkIn(participants[0].address)
    ).to.be.revertedWith("You don't have permission to check people in.");
    await expect(
      EventStaking.checkIn(participants[0].address)
    ).to.be.revertedWith("This address does not belong to anyone who RSVP'd.");
    await expect(EventStaking.checkIn(deployer.address)).to.be.revertedWith(
      "This address does not belong to anyone who RSVP'd."
    );
  });

  it("Should allow withdrawal of flaked stakers.", async () => {
    const { EventStaking, participants } = await setup();

    // 7 RSVPs | Balance: 0.07 ETH
    for (let i = 0; i < 7; i++) {
      await participants[i].EventStaking.rsvp({
        value: RSVP_FEE,
      });
    }

    let balance = RSVP_FEE.mul(7);
    for (let i = 2; i >= 0; i--) {
      balance = balance.sub(RSVP_FEE);
      await expect(EventStaking.checkIn(participants[i].address))
        .to.emit(EventStaking, "CheckInEvent")
        .withArgs(participants[i].address, balance);
    }
    // 3 Check Ins | Balance: 0.04 ETH
    let withdrawalAmount = RSVP_FEE.mul(4).div(3);

    await ethers.provider.send("evm_increaseTime", [100000]);

    for (let i = 0; i <= 2; i++) {
      await expect(participants[i].EventStaking.withdrawFlakersStake())
        .to.emit(EventStaking, "WithdrawFlakersStake")
        .withArgs(participants[i].address, withdrawalAmount);
    }
  });

  it("Should catch invalid withdrawal attemps.", async () => {
    const { EventStaking, participants } = await setup();
    await participants[0].EventStaking.rsvp({
      value: RSVP_FEE,
    });
    await EventStaking.checkIn(participants[0].address);

    await expect(
      participants[0].EventStaking.withdrawFlakersStake()
    ).to.be.revertedWith("The event hasn't started yet");
    await ethers.provider.send("evm_increaseTime", [100000]);
    await expect(
      participants[1].EventStaking.withdrawFlakersStake()
    ).to.be.revertedWith("You are not eligible to withdraw.");
    await expect(EventStaking.withdrawFlakersStake()).to.be.revertedWith(
      "You are not eligible to withdraw."
    );
  });
});
