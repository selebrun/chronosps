
interface ButtonProps {
  styleButton?: string;
  nameButton: string;
  disabled: boolean;
  onClickButton: Function;
};


const Button = ({ styleButton, nameButton, disabled, onClickButton }: ButtonProps) => {
  return (
    <button
      disabled={disabled}
      className={styleButton}
      onClick={onClickButton()}
    >{nameButton}</button>
  );
}

export default Button