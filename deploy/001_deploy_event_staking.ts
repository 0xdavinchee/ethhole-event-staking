import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { getDate } from "../test/utils";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();
  const { deploy } = deployments;

  await deploy("EventStaking", {
    from: deployer,
    args: [getDate(), ethers.utils.parseEther("0.01")],
    log: true,
  });
};

export default func;
func.tags = ["EventStaking"];
